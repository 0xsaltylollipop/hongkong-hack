class HWExecError(RuntimeError):
    """Base error for hwexec."""


class HardwareUnavailableError(HWExecError):
    """Raised when a real hardware operation cannot run."""


class PolicyUnavailableError(HWExecError):
    """Raised when a policy operation cannot run."""
