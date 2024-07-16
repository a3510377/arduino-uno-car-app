use std::{
    collections::HashMap,
    sync::{mpsc::Sender, Arc, Mutex},
};

use serde::Serialize;
use serialport::{DataBits, FlowControl, Parity, SerialPort, StopBits};

use super::errors::{ErrorKind, IOErrorKind};

pub struct SerialPortsState {
    pub listen_ports: Arc<Mutex<HashMap<String, SerialPortState>>>,
}

pub struct SerialPortState {
    pub port: Box<dyn SerialPort>,
    pub sender: Option<Sender<usize>>,
}

#[derive(Debug, Serialize, Clone)]
pub struct PortInfo {
    pub port_name: String,
    pub port_type: String,
    pub show_name: String,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ReadData<'a> {
    pub data: &'a [u8],
    pub size: usize,
}

pub fn parse_data_bits(value: Option<usize>) -> DataBits {
    match value {
        Some(5) => DataBits::Five,
        Some(6) => DataBits::Six,
        Some(7) => DataBits::Seven,
        Some(8) => DataBits::Eight,
        _ => DataBits::Eight,
    }
}

pub fn parse_flow_control(value: Option<String>) -> FlowControl {
    match value {
        Some(value) => match value.as_str() {
            "none" => FlowControl::None,
            "software" => FlowControl::Software,
            "hardware" => FlowControl::Hardware,
            _ => FlowControl::None,
        },
        _ => FlowControl::None,
    }
}

pub fn parse_parity(value: Option<String>) -> Parity {
    match value {
        Some(value) => match value.as_str() {
            "none" => Parity::None,
            "odd" => Parity::Odd,
            "even" => Parity::Even,
            _ => Parity::None,
        },
        _ => Parity::None,
    }
}

pub fn parse_stop_bits(value: Option<usize>) -> StopBits {
    match value {
        Some(1) => StopBits::One,
        Some(2) => StopBits::Two,
        _ => StopBits::One,
    }
}

pub fn parse_serialport_error_kind(value: serialport::ErrorKind) -> ErrorKind {
    match value {
        serialport::ErrorKind::Io(err) => match err {
            std::io::ErrorKind::NotFound => ErrorKind::IOError(IOErrorKind::NotFound),
            std::io::ErrorKind::PermissionDenied => {
                ErrorKind::IOError(IOErrorKind::PermissionDenied)
            }
            std::io::ErrorKind::ConnectionRefused => {
                ErrorKind::IOError(IOErrorKind::ConnectionRefused)
            }
            std::io::ErrorKind::ConnectionReset => ErrorKind::IOError(IOErrorKind::ConnectionReset),
            _ => ErrorKind::IOError(IOErrorKind::Unknown),
        },
        serialport::ErrorKind::NoDevice => ErrorKind::NoDevice,
        serialport::ErrorKind::InvalidInput => ErrorKind::InvalidInput,
        serialport::ErrorKind::Unknown => ErrorKind::Unknown,
    }
}
