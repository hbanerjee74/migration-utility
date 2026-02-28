use std::path::PathBuf;
use std::{fs, io::Write};

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, Lines};
use tokio::process::{Child, ChildStdin, ChildStdout, Command};
use tokio::sync::Mutex;

use crate::db::DbState;

const DEFAULT_MODEL: &str = "claude-sonnet-4-6";

pub struct SidecarManager(Mutex<Option<PersistentSidecar>>);

impl Default for SidecarManager {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

struct PersistentSidecar {
    child: Child,
    stdin: ChildStdin,
    stdout: Lines<BufReader<ChildStdout>>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SidecarConfigPayload {
    prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    system_prompt: Option<String>,
    model: String,
    api_key: String,
    cwd: String,
}

#[derive(Serialize)]
struct SidecarAgentRequest {
    #[serde(rename = "type")]
    type_name: &'static str,
    request_id: String,
    config: SidecarConfigPayload,
}

#[derive(Clone)]
struct AgentRequest {
    id: String,
    config: SidecarConfigPayload,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct MonitorStreamEvent {
    request_id: String,
    event_type: String,
    content: Option<String>,
    done: Option<bool>,
    tool_name: Option<String>,
    subtype: Option<String>,
    total_cost_usd: Option<f64>,
    input_tokens: Option<i64>,
    output_tokens: Option<i64>,
}

#[tauri::command]
pub async fn monitor_launch_agent(
    prompt: String,
    system_prompt: Option<String>,
    state: State<'_, DbState>,
    app: AppHandle,
    sidecar: State<'_, SidecarManager>,
) -> Result<String, String> {
    log::info!("monitor_launch_agent");
    let request = {
        let conn = state
            .0
            .lock()
            .map_err(|e| format!("monitor_launch_agent: failed to acquire DB lock: {e}"))?;

        let settings = crate::db::read_settings(&conn)?;
        let api_key = settings
            .anthropic_api_key
            .filter(|k| !k.trim().is_empty())
            .ok_or_else(|| "Anthropic API key is not configured in Settings".to_string())?;

        let working_directory = resolve_working_directory(&conn, &app)?;
        build_request(prompt, system_prompt, api_key, working_directory)
    };

    let log_path = prepare_log_path(&request.config.cwd, &request.id)?;
    append_log_line(&log_path, &transcript_config_line(&request.config))?;
    log::info!("monitor_launch_agent: transcript={}", log_path.display());

    let mut guard = sidecar.0.lock().await;
    ensure_sidecar_ready(&mut guard).await?;
    let proc = guard
        .as_mut()
        .ok_or_else(|| "monitor_launch_agent: sidecar unavailable after startup".to_string())?;

    let envelope = SidecarAgentRequest {
        type_name: "agent_request",
        request_id: request.id.clone(),
        config: request.config.clone(),
    };
    let request_json = serde_json::to_string(&envelope)
        .map_err(|e| format!("monitor_launch_agent: failed to serialize sidecar request: {e}"))?;
    proc.stdin
        .write_all(format!("{request_json}\n").as_bytes())
        .await
        .map_err(|e| {
            format!("monitor_launch_agent: failed writing request to sidecar stdin: {e}")
        })?;
    proc.stdin
        .flush()
        .await
        .map_err(|e| format!("monitor_launch_agent: failed flushing sidecar stdin: {e}"))?;

    let mut aggregated = String::new();
    let mut saw_done = false;

    while let Some(line) = proc
        .stdout
        .next_line()
        .await
        .map_err(|e| format!("monitor_launch_agent: failed reading sidecar stdout: {e}"))?
    {
        log::debug!("monitor_launch_agent[sidecar:stdout]: {}", line);
        append_request_scoped_sidecar_line(&log_path, request.id.as_str(), &line)?;
        emit_monitor_stream_event(&app, request.id.as_str(), &line);
        match handle_sidecar_line(&line, request.id.as_str(), &mut aggregated)? {
            SidecarLineResult::Continue => continue,
            SidecarLineResult::Done => {
                saw_done = true;
                break;
            }
        }
    }

    if !saw_done {
        *guard = None;
        append_log_line(
            &log_path,
            &serde_json::json!({"type":"error","message":"sidecar stream ended before completion"})
                .to_string(),
        )?;
        return Err("monitor_launch_agent: sidecar stream ended before completion".to_string());
    }

    if aggregated.trim().is_empty() {
        Ok("Agent run completed with no text output".to_string())
    } else {
        Ok(aggregated)
    }
}

fn emit_monitor_stream_event(app: &AppHandle, request_id: &str, line: &str) {
    let parsed: Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(_) => return,
    };
    let id = parsed
        .get("id")
        .and_then(Value::as_str)
        .or_else(|| parsed.get("request_id").and_then(Value::as_str))
        .unwrap_or_default();
    if id != request_id {
        return;
    }

    let message_type = parsed
        .get("type")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let payload = match message_type {
        "agent_response" => MonitorStreamEvent {
            request_id: request_id.to_string(),
            event_type: "agent_response".to_string(),
            content: parsed
                .get("content")
                .and_then(Value::as_str)
                .map(|s| s.to_string()),
            done: parsed.get("done").and_then(Value::as_bool),
            tool_name: None,
            subtype: None,
            total_cost_usd: None,
            input_tokens: None,
            output_tokens: None,
        },
        "agent_event" => {
            let event = parsed.get("event").unwrap_or(&Value::Null);
            let subtype = event
                .get("type")
                .and_then(Value::as_str)
                .map(|s| s.to_string());
            MonitorStreamEvent {
                request_id: request_id.to_string(),
                event_type: "agent_event".to_string(),
                content: None,
                done: None,
                tool_name: event
                    .get("tool_name")
                    .and_then(Value::as_str)
                    .map(|s| s.to_string()),
                subtype,
                total_cost_usd: event.get("total_cost_usd").and_then(Value::as_f64),
                input_tokens: event
                    .get("usage")
                    .and_then(|u| u.get("input_tokens"))
                    .and_then(Value::as_i64),
                output_tokens: event
                    .get("usage")
                    .and_then(|u| u.get("output_tokens"))
                    .and_then(Value::as_i64),
            }
        }
        "error" | "agent_error" => MonitorStreamEvent {
            request_id: request_id.to_string(),
            event_type: "error".to_string(),
            content: parsed
                .get("message")
                .and_then(Value::as_str)
                .map(|s| s.to_string()),
            done: Some(true),
            tool_name: None,
            subtype: None,
            total_cost_usd: None,
            input_tokens: None,
            output_tokens: None,
        },
        _ => return,
    };

    if let Err(e) = app.emit("monitor-agent-stream", payload) {
        log::warn!("monitor_launch_agent: failed to emit monitor-agent-stream: {e}");
    }
}

async fn ensure_sidecar_ready(slot: &mut Option<PersistentSidecar>) -> Result<(), String> {
    let mut needs_spawn = slot.is_none();
    if let Some(proc) = slot.as_mut() {
        match proc.child.try_wait() {
            Ok(Some(status)) => {
                log::warn!("monitor_launch_agent: sidecar exited, status={status}");
                needs_spawn = true;
            }
            Ok(None) => {}
            Err(e) => {
                log::warn!("monitor_launch_agent: sidecar try_wait failed: {e}");
                needs_spawn = true;
            }
        }
    }
    if !needs_spawn {
        return Ok(());
    }

    let sidecar_entry = resolve_sidecar_entrypoint()?;
    let mut child = Command::new("node")
        .arg(&sidecar_entry)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("monitor_launch_agent: failed to spawn Node sidecar: {e}"))?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "monitor_launch_agent: missing sidecar stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "monitor_launch_agent: missing sidecar stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "monitor_launch_agent: missing sidecar stderr".to_string())?;

    tokio::spawn(async move {
        let mut stderr_reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            log::debug!("monitor_launch_agent[sidecar:stderr]: {}", line);
        }
    });

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut ready_seen = false;
    for _ in 0..50 {
        if let Some(line) = stdout_reader.next_line().await.map_err(|e| {
            format!("monitor_launch_agent: failed reading sidecar startup line: {e}")
        })? {
            log::debug!("monitor_launch_agent[sidecar:stdout]: {}", line);
            if parse_message_type(&line).as_deref() == Some("sidecar_ready") {
                ready_seen = true;
                break;
            }
        } else {
            break;
        }
    }

    if !ready_seen {
        let _ = child.kill().await;
        return Err("monitor_launch_agent: sidecar did not emit sidecar_ready".to_string());
    }

    *slot = Some(PersistentSidecar {
        child,
        stdin,
        stdout: stdout_reader,
    });
    Ok(())
}

fn prepare_log_path(working_directory: &str, request_id: &str) -> Result<PathBuf, String> {
    let logs_dir = PathBuf::from(working_directory).join("logs");
    fs::create_dir_all(&logs_dir)
        .map_err(|e| format!("monitor_launch_agent: failed to create logs dir: {e}"))?;
    Ok(logs_dir.join(format!("agent-{request_id}.jsonl")))
}

fn append_log_line(path: &PathBuf, line: &str) -> Result<(), String> {
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|e| format!("monitor_launch_agent: failed to open transcript log: {e}"))?;
    writeln!(file, "{line}")
        .map_err(|e| format!("monitor_launch_agent: failed to append transcript line: {e}"))
}

fn transcript_config_line(config: &SidecarConfigPayload) -> String {
    serde_json::json!({
        "type": "config",
        "config": {
            "prompt": config.prompt,
            "systemPrompt": config.system_prompt,
            "model": config.model,
            "apiKey": "[REDACTED]",
            "cwd": config.cwd,
            "settingSources": ["project"],
            "systemPromptPreset": "claude_code",
            "permissionMode": "bypassPermissions",
            "allowDangerouslySkipPermissions": true
        }
    })
    .to_string()
}

fn append_request_scoped_sidecar_line(
    path: &PathBuf,
    request_id: &str,
    sidecar_line: &str,
) -> Result<(), String> {
    let parsed: Value = match serde_json::from_str(sidecar_line) {
        Ok(v) => v,
        Err(_) => return Ok(()),
    };

    let id = parsed
        .get("id")
        .and_then(|v| v.as_str())
        .or_else(|| parsed.get("request_id").and_then(|v| v.as_str()));
    if id != Some(request_id) {
        return Ok(());
    }

    append_log_line(path, sidecar_line)
}

fn resolve_sidecar_entrypoint() -> Result<PathBuf, String> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("sidecar")
        .join("dist")
        .join("index.js");
    if path.exists() {
        Ok(path)
    } else {
        Err(format!(
            "monitor_launch_agent: Node sidecar entrypoint not found at {} (run `npm run sidecar:build` from app/)",
            path.display()
        ))
    }
}

fn resolve_working_directory(
    conn: &rusqlite::Connection,
    app: &AppHandle,
) -> Result<String, String> {
    let latest_workspace_dir: Option<String> = conn
        .query_row(
            "SELECT migration_repo_path FROM workspaces ORDER BY created_at DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    if let Some(path) = latest_workspace_dir {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    let home = app
        .path()
        .home_dir()
        .map_err(|e| format!("monitor_launch_agent: failed to resolve home dir: {e}"))?;
    Ok(home
        .join(".vibedata")
        .join("migration-utility")
        .to_string_lossy()
        .to_string())
}

fn build_request(
    prompt: String,
    system_prompt: Option<String>,
    api_key: String,
    working_directory: String,
) -> AgentRequest {
    AgentRequest {
        id: format!("agent-{}", uuid::Uuid::new_v4()),
        config: SidecarConfigPayload {
            prompt,
            system_prompt,
            model: DEFAULT_MODEL.to_string(),
            api_key,
            cwd: working_directory,
        },
    }
}

#[derive(Debug, PartialEq, Eq)]
enum SidecarLineResult {
    Continue,
    Done,
}

fn parse_message_type(line: &str) -> Option<String> {
    let v: Value = serde_json::from_str(line).ok()?;
    Some(v.get("type")?.as_str()?.to_string())
}

fn handle_sidecar_line(
    line: &str,
    request_id: &str,
    aggregated: &mut String,
) -> Result<SidecarLineResult, String> {
    let parsed: Value = serde_json::from_str(line)
        .map_err(|e| format!("monitor_launch_agent: invalid sidecar JSON line: {e}"))?;
    let message_type = parsed
        .get("type")
        .and_then(Value::as_str)
        .ok_or_else(|| "monitor_launch_agent: sidecar line missing type".to_string())?;

    match message_type {
        "agent_response" => {
            let id = parsed
                .get("id")
                .and_then(Value::as_str)
                .or_else(|| parsed.get("request_id").and_then(Value::as_str))
                .unwrap_or_default();
            if id != request_id {
                return Ok(SidecarLineResult::Continue);
            }
            if let Some(content) = parsed.get("content").and_then(Value::as_str) {
                aggregated.push_str(content);
            }
            let done = parsed.get("done").and_then(Value::as_bool).unwrap_or(false);
            if done {
                Ok(SidecarLineResult::Done)
            } else {
                Ok(SidecarLineResult::Continue)
            }
        }
        "request_complete" => {
            let id = parsed
                .get("request_id")
                .and_then(Value::as_str)
                .unwrap_or_default();
            if id == request_id {
                Ok(SidecarLineResult::Done)
            } else {
                Ok(SidecarLineResult::Continue)
            }
        }
        "error" | "agent_error" => {
            let id = parsed
                .get("id")
                .and_then(Value::as_str)
                .or_else(|| parsed.get("request_id").and_then(Value::as_str))
                .unwrap_or_default();
            if id != request_id {
                return Ok(SidecarLineResult::Continue);
            }
            let message = parsed
                .get("message")
                .or_else(|| parsed.get("error"))
                .and_then(Value::as_str)
                .unwrap_or("Unknown sidecar error");
            Err(format!(
                "monitor_launch_agent: sidecar agent error: {message}"
            ))
        }
        _ => Ok(SidecarLineResult::Continue),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        append_request_scoped_sidecar_line, build_request, handle_sidecar_line, parse_message_type,
        prepare_log_path, transcript_config_line, SidecarLineResult,
    };
    use std::fs;

    #[test]
    fn request_serializes_api_key_and_working_directory() {
        let req = build_request(
            "prompt".to_string(),
            Some("system".to_string()),
            "sk-ant-test".to_string(),
            "/tmp/work".to_string(),
        );
        let json = serde_json::to_value(&req.config).unwrap();
        assert_eq!(
            json.get("apiKey").and_then(|v| v.as_str()),
            Some("sk-ant-test")
        );
        assert_eq!(json.get("cwd").and_then(|v| v.as_str()), Some("/tmp/work"));
    }

    #[test]
    fn transcript_config_line_redacts_api_key_and_keeps_prompt() {
        let req = build_request(
            "prompt body".to_string(),
            Some("system".to_string()),
            "sk-ant-secret".to_string(),
            "/tmp/work".to_string(),
        );
        let line = transcript_config_line(&req.config);
        let json: serde_json::Value = serde_json::from_str(&line).unwrap();
        let cfg = json.get("config").unwrap();
        assert_eq!(
            cfg.get("apiKey").and_then(|v| v.as_str()),
            Some("[REDACTED]")
        );
        assert_eq!(
            cfg.get("prompt").and_then(|v| v.as_str()),
            Some("prompt body")
        );
        assert_eq!(cfg.get("cwd").and_then(|v| v.as_str()), Some("/tmp/work"));
    }

    #[test]
    fn parse_message_type_extracts_type() {
        assert_eq!(
            parse_message_type(r#"{"type":"sidecar_ready"}"#).as_deref(),
            Some("sidecar_ready")
        );
    }

    #[test]
    fn handle_sidecar_line_aggregates_until_done() {
        let mut aggregated = String::new();
        let id = "agent-1";
        let first =
            r#"{"type":"agent_response","request_id":"agent-1","content":"hello ","done":false}"#
                .to_string();
        let second =
            r#"{"type":"agent_response","request_id":"agent-1","content":"world","done":true}"#
                .to_string();

        let r1 = handle_sidecar_line(&first, id, &mut aggregated).unwrap();
        let r2 = handle_sidecar_line(&second, id, &mut aggregated).unwrap();

        assert_eq!(r1, SidecarLineResult::Continue);
        assert_eq!(r2, SidecarLineResult::Done);
        assert_eq!(aggregated, "hello world");
    }

    #[test]
    fn append_request_scoped_sidecar_line_writes_only_matching_request_id() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("t.jsonl");
        let id = "req-123";

        let matching = serde_json::json!({
            "type":"system",
            "request_id": id,
            "subtype":"sdk_ready",
            "timestamp": 1
        })
        .to_string();
        let other = serde_json::json!({
            "type":"system",
            "request_id":"req-other",
            "subtype":"sdk_ready",
            "timestamp": 2
        })
        .to_string();

        append_request_scoped_sidecar_line(&file, id, &other).unwrap();
        append_request_scoped_sidecar_line(&file, id, &matching).unwrap();

        let contents = fs::read_to_string(file).unwrap();
        assert!(contents.contains("\"request_id\":\"req-123\""));
        assert!(!contents.contains("\"request_id\":\"req-other\""));
    }

    #[test]
    fn prepare_log_path_creates_logs_folder_under_working_directory() {
        let tmp = tempfile::tempdir().unwrap();
        let working = tmp.path().join("repo");
        let path = prepare_log_path(&working.to_string_lossy(), "req-123").unwrap();
        assert!(working.join("logs").is_dir());
        assert!(path.ends_with("agent-req-123.jsonl"));
    }
}
