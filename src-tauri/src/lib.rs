use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use serde::Deserialize;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode},
    Connection, SqliteConnection,
};
use std::path::PathBuf;
use std::time::Duration;

#[tauri::command]
fn apply_database_migration(
    app: tauri::AppHandle,
    statements: Vec<String>,
    version: i64,
    name: String,
    checksum: String,
    applied_at: String,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    let database_path = app_data_dir.join("civicforge.db");
    std::thread::spawn(move || {
        tauri::async_runtime::block_on(run_database_migration(
            database_path,
            statements,
            version,
            name,
            checksum,
            applied_at,
        ))
    })
    .join()
    .map_err(|_| "database migration worker panicked".to_string())?
    .map_err(|error| error.to_string())
}

async fn run_database_migration(
    database_path: PathBuf,
    statements: Vec<String>,
    version: i64,
    name: String,
    checksum: String,
    applied_at: String,
) -> Result<(), sqlx::Error> {
    let mut connection = open_database_connection(database_path).await?;
    let mut transaction = connection.begin().await?;

    for statement in statements {
        sqlx::raw_sql(&statement)
            .execute(&mut *transaction)
            .await?;
    }

    sqlx::query(
        "INSERT OR IGNORE INTO schema_migrations (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)",
    )
    .bind(version)
    .bind(name)
    .bind(checksum)
    .bind(applied_at)
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;
    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseOperation {
    sql: String,
    bind_values: Vec<serde_json::Value>,
}

#[tauri::command]
fn execute_database_transaction(
    app: tauri::AppHandle,
    operations: Vec<DatabaseOperation>,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    let database_path = app_data_dir.join("civicforge.db");
    std::thread::spawn(move || {
        tauri::async_runtime::block_on(run_database_transaction(database_path, operations))
    })
    .join()
    .map_err(|_| "database transaction worker panicked".to_string())?
    .map_err(|error| error.to_string())
}

async fn run_database_transaction(
    database_path: PathBuf,
    operations: Vec<DatabaseOperation>,
) -> Result<(), sqlx::Error> {
    let mut connection = open_database_connection(database_path).await?;
    let mut transaction = connection.begin().await?;

    for operation in operations {
        let mut query = sqlx::query(&operation.sql);
        for value in operation.bind_values {
            query = match value {
                serde_json::Value::Null => query.bind(Option::<String>::None),
                serde_json::Value::Bool(value) => query.bind(value),
                serde_json::Value::Number(value) if value.is_i64() => {
                    query.bind(value.as_i64().unwrap_or_default())
                }
                serde_json::Value::Number(value) => query.bind(value.as_f64().unwrap_or_default()),
                serde_json::Value::String(value) => query.bind(value),
                value => query.bind(value.to_string()),
            };
        }
        query.execute(&mut *transaction).await?;
    }

    transaction.commit().await?;
    Ok(())
}

async fn open_database_connection(database_path: PathBuf) -> Result<SqliteConnection, sqlx::Error> {
    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(Duration::from_secs(10));
    SqliteConnection::connect_with(&options).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            apply_database_migration,
            execute_database_transaction
        ])
        .setup(|app| {
            let open_main = MenuItem::with_id(app, "open-main", "打开 CivicForge", true, None::<&str>)?;
            let open_widget =
                MenuItem::with_id(app, "open-widget", "显示学习小组件", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_main, &open_widget, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("app icon").clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open-main" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "open-widget" => {
                        if let Some(window) = app.get_webview_window("study-widget") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run CivicForge");
}
