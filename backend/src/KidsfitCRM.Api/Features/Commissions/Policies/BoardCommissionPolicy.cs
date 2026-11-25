using KidsfitCRM.Api.Domain;

namespace KidsfitCRM.Api.Features;

internal static class BoardCommissionPolicy
{
    internal const decimal DefaultSales = 25m;
    internal const decimal DefaultManager = 5m;

    internal static bool ValidRates(decimal sales, decimal manager) =>
        sales >= 0 && manager >= 0 && sales <= 100 && manager <= 100 &&
        sales + manager <= 100 &&
        decimal.Round(sales, 4) == sales && decimal.Round(manager, 4) == manager;

    internal static BoardCommissionPolicyVersion? Latest(
        IEnumerable<BoardCommissionPolicyVersion> policies, string scope,
        long? organizationId = null, long? managerUserId = null, long? salesUserId = null) =>
        policies.Where(x => x.Scope == scope &&
                    (scope == "SYSTEM" ||
                     (x.OrganizationId == organizationId &&
                      (scope == "MANAGER" ? x.ManagerUserId == managerUserId :
                       x.SalesUserId == salesUserId))))
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .FirstOrDefault();

    internal static (decimal Sales, decimal Manager, string Source, long? VersionId) Resolve(
        IEnumerable<BoardCommissionPolicyVersion> policies,
        long organizationId, long? managerUserId, long salesUserId)
    {
        var rules = policies as BoardCommissionPolicyVersion[] ?? policies.ToArray();
        var own = Latest(rules, "SALES", organizationId, salesUserId: salesUserId);
        if (own?.Status == "ACTIVE") return (own.SalesPercent, own.ManagerPercent, "SALES", own.Id);
        if (managerUserId.HasValue)
        {
            var team = Latest(rules, "MANAGER", organizationId, managerUserId);
            if (team?.Status == "ACTIVE") return (team.SalesPercent, team.ManagerPercent, "MANAGER", team.Id);
        }
        var system = Latest(rules, "SYSTEM");
        if (system?.Status == "ACTIVE") return (system.SalesPercent, system.ManagerPercent, "SYSTEM", system.Id);
        return (DefaultSales, DefaultManager, "SYSTEM_DEFAULT", null);
    }

    /// <summary>
    /// Freeze the policy that existed when the cash was received. A subsequent
    /// Director edit never recalculates previously accrued commission.
    /// </summary>
    internal static (decimal Sales, decimal Manager, string Source, long? VersionId) ResolveAt(
        IEnumerable<BoardCommissionPolicyVersion> policies,
        long organizationId, long? managerUserId, long salesUserId, DateTime receivedAt)
    {
        var eligible = policies.Where(p => p.CreatedAt <= receivedAt);
        return Resolve(eligible, organizationId, managerUserId, salesUserId);
    }
}
