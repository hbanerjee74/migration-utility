use tauri::State;

use crate::db::DbState;
use crate::types::{DeviceFlowResponse, GitHubAuthResult, GitHubUser};

const GITHUB_CLIENT_ID: &str = "Ov23lioPbQz4gAFxEfhM";

/// Start the GitHub Device Flow by requesting a device code.
#[tauri::command]
pub async fn github_start_device_flow() -> Result<DeviceFlowResponse, String> {
    log::info!("[github_start_device_flow] starting device flow");
    let client = reqwest::Client::new();

    let response = client
        .post("https://github.com/login/device/code")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", GITHUB_CLIENT_ID),
            ("scope", "repo,read:user"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to start device flow: {e}"))?;

    let status = response.status();
    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse device flow response: {e}"))?;

    if !status.is_success() {
        let message = body["error_description"]
            .as_str()
            .or_else(|| body["error"].as_str())
            .unwrap_or("Unknown error");
        return Err(format!("GitHub device flow error ({}): {}", status, message));
    }

    let device_code = body["device_code"]
        .as_str()
        .ok_or("Missing device_code in response")?
        .to_string();
    let user_code = body["user_code"]
        .as_str()
        .ok_or("Missing user_code in response")?
        .to_string();
    let verification_uri = body["verification_uri"]
        .as_str()
        .ok_or("Missing verification_uri in response")?
        .to_string();
    let expires_in = body["expires_in"]
        .as_u64()
        .ok_or("Missing expires_in in response")?;
    let interval = body["interval"].as_u64().unwrap_or(5);

    Ok(DeviceFlowResponse {
        device_code,
        user_code,
        verification_uri,
        expires_in,
        interval,
    })
}

/// Poll GitHub for the access token using the device code.
/// Returns Pending while the user hasn't authorized, SlowDown if polling too fast,
/// or Success with the user profile once authorized.
#[tauri::command]
pub async fn github_poll_for_token(
    state: State<'_, DbState>,
    device_code: String,
) -> Result<GitHubAuthResult, String> {
    log::info!("[github_poll_for_token] polling for token");
    let client = reqwest::Client::new();

    let response = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", GITHUB_CLIENT_ID),
            ("device_code", device_code.as_str()),
            (
                "grant_type",
                "urn:ietf:params:oauth:grant-type:device_code",
            ),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to poll for token: {e}"))?;

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {e}"))?;

    if let Some(error) = body["error"].as_str() {
        return match error {
            "authorization_pending" => Ok(GitHubAuthResult::Pending),
            "slow_down" => Ok(GitHubAuthResult::SlowDown),
            _ => {
                let description = body["error_description"]
                    .as_str()
                    .unwrap_or("Unknown error");
                Err(format!("GitHub OAuth error: {} — {}", error, description))
            }
        };
    }

    let access_token = body["access_token"]
        .as_str()
        .ok_or("Missing access_token in response")?
        .to_string();

    let user = fetch_github_user(&client, &access_token).await?;

    {
        let conn = state.0.lock().unwrap();
        let mut settings = crate::db::read_settings(&conn)?;
        settings.github_user_login = Some(user.login.clone());
        settings.github_user_avatar = Some(user.avatar_url.clone());
        settings.github_user_email = user.email.clone();
        settings.github_oauth_token = Some(access_token);
        crate::db::write_settings(&conn, &settings)?;
    }

    Ok(GitHubAuthResult::Success { user })
}

/// Get the currently authenticated GitHub user from the database.
/// Returns None if not signed in.
#[tauri::command]
pub fn github_get_user(state: State<'_, DbState>) -> Result<Option<GitHubUser>, String> {
    log::info!("[github_get_user]");
    let conn = state.0.lock().unwrap();
    let settings = crate::db::read_settings(&conn)?;

    if settings.github_oauth_token.is_some() {
        let login = settings.github_user_login.unwrap_or_default();
        let avatar_url = settings.github_user_avatar.unwrap_or_default();
        let email = settings.github_user_email;
        Ok(Some(GitHubUser {
            login,
            avatar_url,
            email,
        }))
    } else {
        Ok(None)
    }
}

/// Sign out of GitHub by clearing all OAuth fields from the database.
#[tauri::command]
pub fn github_logout(state: State<'_, DbState>) -> Result<(), String> {
    log::info!("[github_logout]");
    let conn = state.0.lock().unwrap();
    let mut settings = crate::db::read_settings(&conn)?;
    settings.github_oauth_token = None;
    settings.github_user_login = None;
    settings.github_user_avatar = None;
    settings.github_user_email = None;
    crate::db::write_settings(&conn, &settings)?;
    Ok(())
}

async fn fetch_github_user(client: &reqwest::Client, token: &str) -> Result<GitHubUser, String> {
    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", token))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "MigrationUtility")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch GitHub user: {e}"))?;

    let status = response.status();
    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub user response: {e}"))?;

    if !status.is_success() {
        let message = body["message"].as_str().unwrap_or("Unknown error");
        return Err(format!(
            "GitHub API error fetching user ({}): {}",
            status, message
        ));
    }

    let login = body["login"]
        .as_str()
        .ok_or("Missing login in user response")?
        .to_string();
    let avatar_url = body["avatar_url"]
        .as_str()
        .ok_or("Missing avatar_url in user response")?
        .to_string();
    let email = body["email"].as_str().map(|s| s.to_string());

    Ok(GitHubUser {
        login,
        avatar_url,
        email,
    })
}
