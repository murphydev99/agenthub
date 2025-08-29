using Newtonsoft.Json;

namespace AgentHubSupportApi.Models;

public class ServiceNowIncident
{
    [JsonProperty("sys_id")]
    public string? SysId { get; set; }

    [JsonProperty("number")]
    public string? Number { get; set; }

    [JsonProperty("short_description")]
    public string ShortDescription { get; set; } = string.Empty;

    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonProperty("state")]
    public string State { get; set; } = "1"; // New

    [JsonProperty("priority")]
    public string? Priority { get; set; } // Will be calculated from Impact and Urgency

    [JsonProperty("urgency")]
    public string? Urgency { get; set; }

    [JsonProperty("impact")]
    public string? Impact { get; set; }

    [JsonProperty("category")]
    public string? Category { get; set; }

    [JsonProperty("subcategory")]
    public string? Subcategory { get; set; }

    [JsonProperty("caller_id")]
    public string? CallerId { get; set; }

    [JsonProperty("assigned_to")]
    public string? AssignedTo { get; set; }

    [JsonProperty("assignment_group")]
    public string? AssignmentGroup { get; set; }

    [JsonProperty("sys_created_on")]
    public DateTime? CreatedOn { get; set; }

    [JsonProperty("sys_updated_on")]
    public DateTime? UpdatedOn { get; set; }

    // Custom fields for Dunkin/Baskin
    [JsonProperty("u_store_number")]
    public string? StoreNumber { get; set; }

    [JsonProperty("u_pc_number")]
    public string? PCNumber { get; set; }

    [JsonProperty("u_franchisee_id")]
    public string? FranchiseeId { get; set; }

    [JsonProperty("u_franchisee_name")]
    public string? FranchiseeName { get; set; }

    [JsonProperty("u_brand")]
    public string? Brand { get; set; } // "dunkin" or "baskin"

    [JsonProperty("u_client_code")]
    public string? ClientCode { get; set; }

    [JsonProperty("comments")]
    public string? Comments { get; set; }

    [JsonProperty("work_notes")]
    public string? WorkNotes { get; set; }
}

public class ServiceNowResponse<T>
{
    [JsonProperty("result")]
    public T? Result { get; set; }
}

public class ServiceNowListResponse<T>
{
    [JsonProperty("result")]
    public List<T> Result { get; set; } = new List<T>();
}

public class CreateTicketRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StoreNumber { get; set; } = string.Empty;
    public string? PCNumber { get; set; }
    public string? Category { get; set; }
    public string? Priority { get; set; }
    public string? Impact { get; set; }
    public string? Urgency { get; set; }
    public string? Brand { get; set; }
}

public class UpdateTicketRequest
{
    public string? Comments { get; set; }
    public string? State { get; set; }
    public string? Priority { get; set; }
}

public class TicketDto
{
    public string Id { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string StoreNumber { get; set; } = string.Empty;
    public string? PCNumber { get; set; }
    public string? Brand { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime UpdatedDate { get; set; }
}

public static class IncidentState
{
    public const string New = "1";
    public const string InProgress = "2";
    public const string OnHold = "3";
    public const string Resolved = "6";
    public const string Closed = "7";
    public const string Cancelled = "8";
    
    public static string GetStateName(string state)
    {
        return state switch
        {
            "1" => "New",
            "2" => "In Progress",
            "3" => "On Hold",
            "6" => "Resolved",
            "7" => "Closed",
            "8" => "Cancelled",
            _ => "Unknown"
        };
    }
}