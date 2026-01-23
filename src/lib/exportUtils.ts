// CSV Export Utilities

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Build CSV content
  const csvContent = [
    headers.join(";"), // Hungarian Excel uses semicolon
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle different value types
        if (value === null || value === undefined) return "";
        if (typeof value === "string") {
          // Escape quotes and wrap in quotes if contains special chars
          if (value.includes(";") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        if (typeof value === "object") {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        return String(value);
      }).join(";")
    )
  ].join("\n");

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  
  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${formatDateForFilename(new Date())}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// User list export
export interface UserExportData {
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  points_balance: number;
  lifetime_points: number;
  total_redemptions: number;
  total_sessions: number;
  created_at: string;
  last_seen_at: string | null;
}

export function exportUsersToCSV(users: UserExportData[]): void {
  const data = users.map(user => ({
    "Név": user.name,
    "Email": user.email || "",
    "Telefon": user.phone || "",
    "Státusz": user.status === "active" ? "Aktív" : user.status === "inactive" ? "Inaktív" : "Új",
    "Pont egyenleg": user.points_balance,
    "Lifetime pontok": user.lifetime_points,
    "Beváltások": user.total_redemptions,
    "Munkamenetek": user.total_sessions,
    "Regisztráció": user.created_at ? new Date(user.created_at).toLocaleDateString("hu-HU") : "",
    "Utolsó aktivitás": user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString("hu-HU") : "",
  }));
  
  exportToCSV(data, "felhasznalok");
}

// Redemptions export
export interface RedemptionExportData {
  id: string;
  user_name?: string;
  user_id: string;
  venue_name: string;
  drink_name: string;
  value: number;
  status: string;
  redeemed_at: string;
}

export function exportRedemptionsToCSV(redemptions: RedemptionExportData[]): void {
  const statusLabels: Record<string, string> = {
    success: "Sikeres",
    pending: "Függőben",
    failed: "Sikertelen",
    voided: "Visszavonva",
    expired: "Lejárt"
  };

  const data = redemptions.map(r => ({
    "ID": r.id,
    "Felhasználó": r.user_name || r.user_id.slice(0, 8),
    "Helyszín": r.venue_name,
    "Ital": r.drink_name,
    "Érték (Ft)": r.value,
    "Státusz": statusLabels[r.status] || r.status,
    "Dátum": new Date(r.redeemed_at).toLocaleString("hu-HU"),
  }));
  
  exportToCSV(data, "bevaltasok");
}

// User profile export
export interface UserProfileExportData {
  user: {
    name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
  };
  points: {
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
  };
  scores: {
    engagement_score: number;
    churn_risk: string;
    ltv: number;
  };
  stats: {
    total_sessions: number;
    total_free_drink_redemptions: number;
    total_reward_redemptions: number;
  };
}

export function exportUserProfileToCSV(data: UserProfileExportData): void {
  const profileData = [{
    "Név": data.user.name,
    "Email": data.user.email || "",
    "Telefon": data.user.phone || "",
    "Regisztráció": new Date(data.user.created_at).toLocaleDateString("hu-HU"),
    "Pont egyenleg": data.points.balance,
    "Összes szerzett pont": data.points.lifetime_earned,
    "Összes elköltött pont": data.points.lifetime_spent,
    "Engagement Score": data.scores.engagement_score,
    "Lemorzsolódási kockázat": data.scores.churn_risk === "low" ? "Alacsony" : data.scores.churn_risk === "medium" ? "Közepes" : "Magas",
    "Élettartam Érték (Ft)": data.scores.ltv,
    "Munkamenetek": data.stats.total_sessions,
    "Ingyen ital beváltások": data.stats.total_free_drink_redemptions,
    "Jutalom beváltások": data.stats.total_reward_redemptions,
  }];
  
  exportToCSV(profileData, `felhasznalo_${data.user.name.replace(/\s+/g, "_")}`);
}

// User redemptions export
export function exportUserRedemptionsToCSV(
  userName: string,
  freeDrinks: Array<{ drink: string; venue_name: string; value: number; redeemed_at: string }>,
  rewards: Array<{ reward_name: string; venue_name: string; points_spent: number; redeemed_at: string }>
): void {
  const freeDrinkData = freeDrinks.map(r => ({
    "Típus": "Ingyen ital",
    "Megnevezés": r.drink,
    "Helyszín": r.venue_name,
    "Érték/Pont": `${r.value} Ft`,
    "Dátum": new Date(r.redeemed_at).toLocaleString("hu-HU"),
  }));
  
  const rewardData = rewards.map(r => ({
    "Típus": "Jutalom",
    "Megnevezés": r.reward_name,
    "Helyszín": r.venue_name,
    "Érték/Pont": `${r.points_spent} pont`,
    "Dátum": new Date(r.redeemed_at).toLocaleString("hu-HU"),
  }));
  
  exportToCSV([...freeDrinkData, ...rewardData], `bevaltasok_${userName.replace(/\s+/g, "_")}`);
}

// User points history export
export function exportUserPointsToCSV(
  userName: string,
  transactions: Array<{ amount: number; type: string; description: string | null; created_at: string }>
): void {
  const typeLabels: Record<string, string> = {
    purchase: "Vásárlás",
    transaction: "Tranzakció",
    bonus: "Bónusz",
    promotion: "Promóció",
    redemption: "Beváltás",
    reward: "Jutalom",
    other: "Egyéb"
  };

  const data = transactions.map(tx => ({
    "Összeg": tx.amount,
    "Típus": typeLabels[tx.type] || tx.type,
    "Leírás": tx.description || "",
    "Dátum": new Date(tx.created_at).toLocaleString("hu-HU"),
  }));
  
  exportToCSV(data, `pontok_${userName.replace(/\s+/g, "_")}`);
}
