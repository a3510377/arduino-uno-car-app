use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub mod commands;
pub mod errors;
pub mod types;

use commands::*;
use types::SerialPortsState;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("serialport")
        .setup(|app| {
            app.manage(SerialPortsState {
                listen_ports: Arc::new(Mutex::new(HashMap::new())),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            available_ports,
            connect_port,
            start_read_port,
            close_port,
            close_all_port,
            cancel_read_port,
        ])
        .build()
}
