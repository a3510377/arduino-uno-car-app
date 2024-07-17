use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Error {
    pub kind: ErrorKind,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub enum ErrorKind {
    NoDevice,
    InvalidInput,
    Unknown,
    AlreadyOpen,
    IOError(IOErrorKind),
}

#[derive(Debug, Serialize)]
pub enum IOErrorKind {
    NotFound,
    PermissionDenied,
    ConnectionRefused,
    ConnectionReset,
    Unknown,
}
