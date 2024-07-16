use std::{sync::mpsc, thread, time::Duration};

use regex::Regex;
use serialport::SerialPortType;
use tauri::{Runtime, State, Window};

use super::types::{
    parse_data_bits, parse_flow_control, parse_parity, parse_serialport_error_kind,
    parse_stop_bits, PortInfo, ReadData, SerialPortState, SerialPortsState,
};

#[tauri::command]
pub fn available_ports() -> Vec<PortInfo> {
    let mut list = match serialport::available_ports() {
        Ok(list) => list,
        Err(_) => vec![],
    };
    list.sort_by(|a, b| a.port_name.cmp(&b.port_name));
    list.into_iter()
        .map(|i| {
            let (port_type, manufacturer, product) = match &i.port_type {
                SerialPortType::UsbPort(usb) => (
                    "usb".to_string(),
                    usb.manufacturer.clone(),
                    usb.product.clone(),
                ),
                SerialPortType::PciPort => ("pci".to_string(), None, None),
                SerialPortType::BluetoothPort => ("bluetooth".to_string(), None, None),
                SerialPortType::Unknown => ("unknown".to_string(), None, None),
            };
            let port_tag = match &i.port_type {
                SerialPortType::UsbPort(usb) => {
                    let re = Regex::new(r" *\(COM\d+\) *$").unwrap();

                    re.replace_all(
                        usb.product
                            .clone()
                            .unwrap_or_else(|| port_type.clone())
                            .as_str(),
                        "",
                    )
                    .to_string()
                }
                _ => port_type.clone(),
            };

            PortInfo {
                port_name: i.port_name.clone(),
                show_name: format!("{} [{}]", i.port_name, port_tag),
                port_type: port_type.clone(),
                manufacturer,
                product,
            }
        })
        .collect()
}

#[tauri::command]
pub fn connect_port(
    ports_status: State<'_, SerialPortsState>,
    port_name: String,
    baud_rate: Option<u32>,
    data_bits: Option<usize>,
    flow_control: Option<String>,
    parity: Option<String>,
    stop_bits: Option<usize>,
    timeout: Option<u64>,
) -> Result<(), super::errors::Error> {
    match ports_status.listen_ports.lock() {
        Ok(mut ports) => {
            if ports.contains_key(&port_name) {
                return Err(super::errors::Error {
                    kind: super::errors::ErrorKind::AlreadyOpen,
                    description: "".to_string(),
                });
            }

            match serialport::new(&port_name, baud_rate.unwrap_or(115200))
                .data_bits(parse_data_bits(data_bits))
                .flow_control(parse_flow_control(flow_control))
                .parity(parse_parity(parity))
                .stop_bits(parse_stop_bits(stop_bits))
                .timeout(Duration::from_millis(timeout.unwrap_or(500)))
                .open()
            {
                Ok(port) => {
                    ports.insert(port_name, SerialPortState { port, sender: None });

                    Ok(())
                }
                Err(err) => Err(super::errors::Error {
                    kind: parse_serialport_error_kind(err.kind()),
                    description: err.description,
                }),
            }
        }
        Err(err) => Err(super::errors::Error {
            kind: super::errors::ErrorKind::Unknown,
            description: err.to_string(),
        }),
    }
}

#[tauri::command]
pub fn start_read_port<R: Runtime>(
    window: Window<R>,
    ports_status: State<'_, SerialPortsState>,
    port_name: String,
    interval: Option<u64>,
    size: Option<usize>,
) -> Result<(), super::errors::Error> {
    match ports_status.listen_ports.lock() {
        Ok(mut ports) => {
            if let Some(port) = ports.get_mut(&port_name) {
                if port.sender.is_some() {
                    return Ok(());
                }

                let (tx, rx) = mpsc::channel::<usize>();
                port.sender = Some(tx);

                let event_name = format!("plugin:serialport:read-{port_name}");
                let event_string_name = format!("plugin:serialport:read-string-{port_name}");
                let mut port = port.port.try_clone().map_err(|err| super::errors::Error {
                    kind: super::errors::ErrorKind::Unknown,
                    description: err.to_string(),
                })?;

                let mut incomplete_buffer: Vec<u8> = Vec::new();
                thread::spawn(move || loop {
                    match rx.try_recv() {
                        Ok(_) => break,
                        Err(err) => match err {
                            mpsc::TryRecvError::Empty => {}
                            mpsc::TryRecvError::Disconnected => {
                                println!("Disconnected from read thread");
                                break;
                            }
                        },
                    }

                    let mut buf: Vec<u8> = vec![0; size.unwrap_or(1024)];
                    if let Ok(size) = port.read(buf.as_mut_slice()) {
                        let _ = window.emit(
                            &event_name,
                            ReadData {
                                size,
                                data: &buf[..size],
                            },
                        );
                        incomplete_buffer.extend_from_slice(&buf[..size]);

                        if let Ok(valid_str) = std::str::from_utf8(&incomplete_buffer) {
                            let _ = window.emit(
                                &event_string_name,
                                ReadData {
                                    size: valid_str.len(),
                                    data: valid_str.as_bytes(),
                                },
                            );
                            incomplete_buffer.clear();
                        } else {
                            // if the data is not valid UTF-8, only keep the bytes that are valid
                            let valid_up_to = incomplete_buffer
                                .iter()
                                .rposition(|&c| c & 0x80 == 0)
                                .unwrap_or(0);

                            let (valid, remainder) = incomplete_buffer.split_at(valid_up_to);
                            let _ = window.emit(
                                &event_string_name,
                                ReadData {
                                    size: valid.len(),
                                    data: valid,
                                },
                            );
                            incomplete_buffer = remainder.to_vec();
                        }
                    }

                    thread::sleep(Duration::from_millis(interval.unwrap_or(200)));
                });
                Ok(())
            } else {
                Err(super::errors::Error {
                    kind: super::errors::ErrorKind::NoDevice,
                    description: "".to_string(),
                })
            }
        }
        Err(err) => Err(super::errors::Error {
            kind: super::errors::ErrorKind::Unknown,
            description: err.to_string(),
        }),
    }
}
