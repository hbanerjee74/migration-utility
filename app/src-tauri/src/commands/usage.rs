use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Manager, State};

use crate::db::DbState;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UsageSummary {
    pub total_runs: usize,
    pub completed_runs: usize,
    pub failed_runs: usize,
    pub total_cost_usd: f64,
    pub total_input_tokens: i64,
    pub total_output_tokens: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UsageRun {
    pub run_id: String,
    pub transcript_path: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub status: String,
    pub model: String,
    pub total_cost_usd: f64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub tools_used: Vec<String>,
    pub skills_loaded: Vec<String>,
    pub preview: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UsageEvent {
    pub event_type: String,
    pub label: String,
    pub content: String,
    pub timestamp_ms: Option<i64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UsageRunDetail {
    pub run: UsageRun,
    pub events: Vec<UsageEvent>,
}

#[tauri::command]
pub fn usage_get_summary(state: State<DbState>, app: AppHandle) -> Result<UsageSummary, String> {
    log::info!("usage_get_summary");
    let conn = state
        .0
        .lock()
        .map_err(|e| format!("usage_get_summary: db lock failed: {e}"))?;
    let logs_dir = resolve_logs_dir(&conn, &app)?;
    let runs = load_runs(&logs_dir)?;

    let mut completed_runs = 0usize;
    let mut failed_runs = 0usize;
    let mut total_cost = 0.0f64;
    let mut total_input = 0i64;
    let mut total_output = 0i64;

    for run in &runs {
        if run.status == "completed" {
            completed_runs += 1;
        } else if run.status == "failed" {
            failed_runs += 1;
        }
        total_cost += run.total_cost_usd;
        total_input += run.input_tokens;
        total_output += run.output_tokens;
    }

    Ok(UsageSummary {
        total_runs: runs.len(),
        completed_runs,
        failed_runs,
        total_cost_usd: total_cost,
        total_input_tokens: total_input,
        total_output_tokens: total_output,
    })
}

#[tauri::command]
pub fn usage_list_runs(
    state: State<DbState>,
    app: AppHandle,
    limit: Option<usize>,
) -> Result<Vec<UsageRun>, String> {
    let limit = limit.unwrap_or(50);
    log::info!("usage_list_runs: limit={}", limit);
    let conn = state
        .0
        .lock()
        .map_err(|e| format!("usage_list_runs: db lock failed: {e}"))?;
    let logs_dir = resolve_logs_dir(&conn, &app)?;
    let mut runs = load_runs(&logs_dir)?;
    runs.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    runs.truncate(limit);
    Ok(runs)
}

#[tauri::command]
pub fn usage_get_run_detail(
    state: State<DbState>,
    app: AppHandle,
    run_id: String,
) -> Result<UsageRunDetail, String> {
    log::info!("usage_get_run_detail: run_id={}", run_id);
    let conn = state
        .0
        .lock()
        .map_err(|e| format!("usage_get_run_detail: db lock failed: {e}"))?;
    let logs_dir = resolve_logs_dir(&conn, &app)?;
    let path = logs_dir.join(format!("agent-{}.jsonl", run_id));
    if !path.exists() {
        return Err(format!("usage_get_run_detail: run not found: {}", run_id));
    }

    let (run, events) = parse_run_file(&path)?;
    Ok(UsageRunDetail { run, events })
}

fn resolve_logs_dir(conn: &rusqlite::Connection, app: &AppHandle) -> Result<PathBuf, String> {
    let latest_workspace_dir: Option<String> = conn
        .query_row(
            "SELECT migration_repo_path FROM workspaces ORDER BY created_at DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    let base = if let Some(path) = latest_workspace_dir {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            PathBuf::from(trimmed)
        } else {
            app.path()
                .home_dir()
                .map_err(|e| format!("usage: failed to resolve home dir: {e}"))?
                .join(".vibedata")
                .join("migration-utility")
        }
    } else {
        app.path()
            .home_dir()
            .map_err(|e| format!("usage: failed to resolve home dir: {e}"))?
            .join(".vibedata")
            .join("migration-utility")
    };
    Ok(base.join("logs"))
}

fn load_runs(logs_dir: &Path) -> Result<Vec<UsageRun>, String> {
    if !logs_dir.exists() {
        return Ok(Vec::new());
    }
    let mut runs = Vec::new();
    let entries = fs::read_dir(logs_dir).map_err(|e| format!("usage: read_dir failed: {e}"))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("usage: read_dir entry failed: {e}"))?;
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if !name.starts_with("agent-") || !name.ends_with(".jsonl") {
            continue;
        }
        let (run, _) = parse_run_file(&path)?;
        runs.push(run);
    }
    Ok(runs)
}

fn parse_run_file(path: &Path) -> Result<(UsageRun, Vec<UsageEvent>), String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("usage: failed reading {}: {e}", path.display()))?;
    let run_id = path
        .file_stem()
        .and_then(|n| n.to_str())
        .unwrap_or_default()
        .trim_start_matches("agent-")
        .to_string();

    let mut model = DEFAULT_MODEL.to_string();
    let mut status = "completed".to_string();
    let mut total_cost = 0.0f64;
    let mut input_tokens = 0i64;
    let mut output_tokens = 0i64;
    let mut tools_used: BTreeSet<String> = BTreeSet::new();
    let mut skills_loaded: BTreeSet<String> = BTreeSet::new();
    let mut preview = String::new();
    let mut first_ts: Option<i64> = None;
    let mut last_ts: Option<i64> = None;
    let mut events: Vec<UsageEvent> = Vec::new();

    for line in content.lines() {
        let Ok(v) = serde_json::from_str::<Value>(line) else {
            continue;
        };
        let line_type = v.get("type").and_then(Value::as_str).unwrap_or("");
        if line_type == "config" {
            if let Some(m) = v
                .get("config")
                .and_then(|c| c.get("model"))
                .and_then(Value::as_str)
            {
                model = m.to_string();
            }
            continue;
        }

        if line_type == "error" || line_type == "agent_error" {
            status = "failed".to_string();
            let message = v
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("Unknown error");
            events.push(UsageEvent {
                event_type: "error".to_string(),
                label: "Error".to_string(),
                content: message.to_string(),
                timestamp_ms: None,
            });
            continue;
        }

        if let Some(ts) = v.get("timestamp").and_then(Value::as_i64) {
            if first_ts.is_none() {
                first_ts = Some(ts);
            }
            last_ts = Some(ts);
        }

        if line_type == "agent_response" {
            let text = v.get("content").and_then(Value::as_str).unwrap_or("");
            if !text.is_empty() && preview.len() < 280 {
                preview.push_str(text);
            }
            let done = v.get("done").and_then(Value::as_bool).unwrap_or(false);
            events.push(UsageEvent {
                event_type: "agent_response".to_string(),
                label: if done {
                    "Assistant (done)"
                } else {
                    "Assistant"
                }
                .to_string(),
                content: text.to_string(),
                timestamp_ms: None,
            });
            continue;
        }

        if line_type != "agent_event" {
            continue;
        }

        let Some(event) = v.get("event") else {
            continue;
        };
        let event_type = event.get("type").and_then(Value::as_str).unwrap_or("");

        match event_type {
            "result" => {
                if event
                    .get("is_error")
                    .and_then(Value::as_bool)
                    .unwrap_or(false)
                {
                    status = "failed".to_string();
                }
                total_cost = event
                    .get("total_cost_usd")
                    .and_then(Value::as_f64)
                    .unwrap_or(total_cost);
                input_tokens = event
                    .get("usage")
                    .and_then(|u| u.get("input_tokens"))
                    .and_then(Value::as_i64)
                    .unwrap_or(input_tokens);
                output_tokens = event
                    .get("usage")
                    .and_then(|u| u.get("output_tokens"))
                    .and_then(Value::as_i64)
                    .unwrap_or(output_tokens);

                let subtype = event
                    .get("subtype")
                    .and_then(Value::as_str)
                    .unwrap_or("result");
                events.push(UsageEvent {
                    event_type: "result".to_string(),
                    label: format!("Result ({subtype})"),
                    content: format!(
                        "cost=${:.4}, tokens={} in / {} out",
                        total_cost, input_tokens, output_tokens
                    ),
                    timestamp_ms: None,
                });
            }
            "tool_progress" => {
                if let Some(tool_name) = event.get("tool_name").and_then(Value::as_str) {
                    tools_used.insert(tool_name.to_string());
                    events.push(UsageEvent {
                        event_type: "tool_progress".to_string(),
                        label: "Tool".to_string(),
                        content: tool_name.to_string(),
                        timestamp_ms: None,
                    });
                }
            }
            "tool_use_summary" => {
                let summary = event
                    .get("summary")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                events.push(UsageEvent {
                    event_type: "tool_use_summary".to_string(),
                    label: "Tool Summary".to_string(),
                    content: summary,
                    timestamp_ms: None,
                });
            }
            "system" => {
                if event.get("subtype").and_then(Value::as_str) == Some("init") {
                    if let Some(skills) = event.get("skills").and_then(Value::as_array) {
                        for s in skills {
                            if let Some(skill) = s.as_str() {
                                skills_loaded.insert(skill.to_string());
                            }
                        }
                    }
                    if let Some(tools) = event.get("tools").and_then(Value::as_array) {
                        for t in tools {
                            if let Some(tool) = t.as_str() {
                                tools_used.insert(tool.to_string());
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    let default_time = fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .map(|t| DateTime::<Utc>::from(t).to_rfc3339())
        .unwrap_or_else(|| Utc::now().to_rfc3339());
    let started_at = first_ts
        .map(epoch_millis_to_rfc3339)
        .unwrap_or_else(|| default_time.clone());
    let completed_at = last_ts.map(epoch_millis_to_rfc3339);

    let run = UsageRun {
        run_id,
        transcript_path: path.to_string_lossy().to_string(),
        started_at,
        completed_at,
        status,
        model,
        total_cost_usd: total_cost,
        input_tokens,
        output_tokens,
        tools_used: tools_used.into_iter().collect(),
        skills_loaded: skills_loaded.into_iter().collect(),
        preview: preview.trim().to_string(),
    };
    Ok((run, events))
}

fn epoch_millis_to_rfc3339(ms: i64) -> String {
    let sec = ms / 1000;
    let nsec = ((ms % 1000) * 1_000_000) as u32;
    DateTime::<Utc>::from_timestamp(sec, nsec)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| Utc::now().to_rfc3339())
}

const DEFAULT_MODEL: &str = "claude-sonnet-4-6";
