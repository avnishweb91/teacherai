import { useEffect, useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";

export default function Profile() {
  const [user, setUser]       = useState(null);
  const [edit, setEdit]       = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/api/user/me");
      setUser(res.data);
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/api/user/me", { name: user.name, email: user.email, boardPreference: user.boardPreference });
      setSuccess("Profile updated successfully.");
      setEdit(false);
    } catch {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#64748b", padding: 24 }}>
          <span className="spinner-dark" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(37,99,235,0.25)", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          Loading profile…
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
        </div>
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="alert-error">
            <span>⚠️</span> {error || "Failed to load profile. Please refresh the page."}
          </div>
          <button className="btn-danger" onClick={logout} style={{ marginTop: 12 }}>
            ⎋ Logout
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const initials = user.name ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : "T";

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account information.</p>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        {/* Avatar */}
        <div className="profile-avatar">{initials}</div>

        {error   && <div className="alert-error"   style={{ marginBottom: 16 }}><span>⚠️</span> {error}</div>}
        {success && <div className="alert-success" style={{ marginBottom: 16 }}><span>✅</span> {success}</div>}

        {/* Name */}
        <div className="profile-row">
          <div className="profile-row-label">Full Name</div>
          {edit ? (
            <input className="form-input" value={user.name || ""} onChange={(e) => setUser({ ...user, name: e.target.value })} style={{ marginTop: 4 }} />
          ) : (
            <div className="profile-row-value">{user.name || "—"}</div>
          )}
        </div>

        {/* Email */}
        <div className="profile-row">
          <div className="profile-row-label">Email Address</div>
          {edit ? (
            <input className="form-input" type="email" value={user.email || ""} onChange={(e) => setUser({ ...user, email: e.target.value })} style={{ marginTop: 4 }} />
          ) : (
            <div className="profile-row-value">{user.email}</div>
          )}
        </div>

        {/* Mobile */}
        <div className="profile-row">
          <div className="profile-row-label">Mobile Number</div>
          <div className="profile-row-value">{user.mobile}</div>
        </div>

        {/* Board */}
        <div className="profile-row">
          <div className="profile-row-label">Board Preference</div>
          {edit ? (
            <select className="form-select" value={user.boardPreference || ""} onChange={(e) => setUser({ ...user, boardPreference: e.target.value })} style={{ marginTop: 4 }}>
              <option value="">Select board</option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="Bihar Board">Bihar Board</option>
            </select>
          ) : (
            <div className="profile-row-value">{user.boardPreference || "—"}</div>
          )}
        </div>

        {/* Role */}
        <div className="profile-row">
          <div className="profile-row-label">Role</div>
          <span className="badge badge-blue">{user.role}</span>
        </div>

        {/* Plan */}
        <div className="profile-row">
          <div className="profile-row-label">Plan</div>
          <span className="badge badge-green">{user.planType}</span>
        </div>

        {/* Member since */}
        {user.createdAt && (
          <div className="profile-row">
            <div className="profile-row-label">Member Since</div>
            <div className="profile-row-value" style={{ color: "#64748b", fontSize: 14 }}>
              {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          {edit ? (
            <>
              <button className="btn-primary" onClick={saveProfile} disabled={saving} style={{ flex: 1 }}>
                {saving && <span className="spinner" style={{ marginRight: 6 }} />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button className="btn-secondary" onClick={() => { setEdit(false); setError(""); loadProfile(); }} disabled={saving} style={{ flex: 1 }}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={() => setEdit(true)} style={{ flex: 1 }}>
              ✏️ Edit Profile
            </button>
          )}
          {!edit && (
            <button className="btn-danger" onClick={logout} style={{ flex: 1 }}>
              ⎋ Logout
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
