using System.Text;
using Newtonsoft.Json;
using AgentHubSupportApi.Interfaces;
using AgentHubSupportApi.Models;

namespace AgentHubSupportApi.Services;

public class ServiceNowService : IServiceNowService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ServiceNowService> _logger;
    private readonly IConfiguration _configuration;

    public ServiceNowService(HttpClient httpClient, ILogger<ServiceNowService> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<List<ServiceNowIncident>> GetIncidentsByStoresAsync(List<string> storeNumbers, string? clientCode = null)
    {
        try
        {
            // Build query for multiple stores
            var storeQuery = string.Join("^OR", storeNumbers.Select(s => $"u_store_number={s}"));
            var query = $"({storeQuery})";
            
            if (!string.IsNullOrEmpty(clientCode))
            {
                query += $"^u_client_code={clientCode}";
            }
            
            query += "^state!=7"; // Exclude closed tickets

            var response = await _httpClient.GetAsync($"/api/now/table/incident?sysparm_query={query}&sysparm_limit=100");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<ServiceNowListResponse<ServiceNowIncident>>(content);
            
            return result?.Result ?? new List<ServiceNowIncident>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching incidents for stores: {Stores}", string.Join(", ", storeNumbers));
            throw;
        }
    }

    public async Task<ServiceNowIncident?> GetIncidentByIdAsync(string sysId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/now/table/incident/{sysId}");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<ServiceNowResponse<ServiceNowIncident>>(content);
            
            return result?.Result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching incident: {SysId}", sysId);
            throw;
        }
    }

    public async Task<ServiceNowIncident> CreateIncidentAsync(ServiceNowIncident incident, string userEmail)
    {
        try
        {
            // Set default assignment group if not provided
            if (string.IsNullOrEmpty(incident.AssignmentGroup))
            {
                incident.AssignmentGroup = _configuration["ServiceNow:DefaultAssignmentGroup"] ?? "679434f053231300e321ddeeff7b12d8"; // Help Desk
            }

            // Set contact type
            incident.Category = incident.Category ?? "inquiry";
            
            // IMPORTANT: Don't set Priority if Impact and Urgency are provided
            // ServiceNow will calculate Priority automatically from Impact and Urgency
            if (!string.IsNullOrEmpty(incident.Impact) && !string.IsNullOrEmpty(incident.Urgency))
            {
                incident.Priority = null; // Let ServiceNow calculate it
            }
            
            var json = JsonConvert.SerializeObject(incident);
            _logger.LogInformation("Sending to ServiceNow API: {Json}", json);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/api/now/table/incident", content);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("ServiceNow Response: {Response}", responseContent);
            var result = JsonConvert.DeserializeObject<ServiceNowResponse<ServiceNowIncident>>(responseContent);
            
            if (result?.Result == null)
            {
                throw new Exception("Failed to create incident - no result returned");
            }

            _logger.LogInformation("Created incident {Number} for store {Store}", result.Result.Number, incident.StoreNumber);
            
            return result.Result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating incident for store: {Store}", incident.StoreNumber);
            throw;
        }
    }

    public async Task<ServiceNowIncident?> UpdateIncidentAsync(string sysId, ServiceNowIncident updates)
    {
        try
        {
            var json = JsonConvert.SerializeObject(updates);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PatchAsync($"/api/now/table/incident/{sysId}", content);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<ServiceNowResponse<ServiceNowIncident>>(responseContent);
            
            return result?.Result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating incident: {SysId}", sysId);
            throw;
        }
    }

    public async Task<bool> AddCommentAsync(string sysId, string comment)
    {
        try
        {
            var update = new ServiceNowIncident
            {
                Comments = comment
            };

            var result = await UpdateIncidentAsync(sysId, update);
            return result != null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding comment to incident: {SysId}", sysId);
            return false;
        }
    }

    public async Task<List<ServiceNowIncident>> SearchIncidentsAsync(string searchTerm, List<string> storeNumbers)
    {
        try
        {
            var storeQuery = string.Join("^OR", storeNumbers.Select(s => $"u_store_number={s}"));
            var query = $"({storeQuery})^short_descriptionLIKE{searchTerm}^ORdescriptionLIKE{searchTerm}";

            var response = await _httpClient.GetAsync($"/api/now/table/incident?sysparm_query={query}&sysparm_limit=50");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<ServiceNowListResponse<ServiceNowIncident>>(content);
            
            return result?.Result ?? new List<ServiceNowIncident>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching incidents for term: {SearchTerm}", searchTerm);
            throw;
        }
    }
}