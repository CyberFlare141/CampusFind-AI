namespace CampusFindAI.Api.Services;

public enum ReportManagementFailure { NotFound, Forbidden, Conflict }

/// <summary>Expected report-management outcome, translated to an HTTP response by the controller.</summary>
public sealed class ReportManagementException(ReportManagementFailure failure, string message)
    : Exception(message)
{
    public ReportManagementFailure Failure { get; } = failure;
}
