
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Activity,
  Server,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  Clock,
  Globe,
  Eye,
  X,
  Gauge,
  Timer,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

const API = "http://127.0.0.1:8000";

interface Monitor {
  id: string;
  name: string;
  url: string;
  method: string;
  interval_seconds: number;
  timeout_seconds: number;
  is_active: boolean;
  created_at: string;
}

interface MonitorStats {
  monitor_id: string;
  monitor_name: string;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  uptime_percentage: number;
  average_response_time_ms: number | null;
}

interface HistoryRecord {
  status_code: number | null;
  response_time_ms: number | null;
  is_success: boolean;
  error_message: string | null;
  checked_at: string;
}

interface MonitorHistory {
  monitor_id: string;
  monitor_name: string;
  total_results: number;
  history: HistoryRecord[];
}

function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [statsByMonitor, setStatsByMonitor] = useState<
    Record<string, MonitorStats>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [selectedMonitor, setSelectedMonitor] =
    useState<Monitor | null>(null);
  const [historyData, setHistoryData] =
    useState<MonitorHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    method: "GET",
    interval_seconds: 60,
    timeout_seconds: 10,
  });

  // Fetch monitors and their statistics
  const fetchMonitors = async () => {
    try {
      const response = await axios.get(`${API}/api/monitors`);
      const monitorList: Monitor[] = response.data;

      setMonitors(monitorList);
      setError("");

      const statsResults = await Promise.all(
        monitorList.map(async (monitor) => {
          try {
            const statsResponse = await axios.get(
              `${API}/api/monitors/${monitor.id}/stats`
            );

            return {
              id: monitor.id,
              stats: statsResponse.data as MonitorStats,
            };
          } catch {
            return {
              id: monitor.id,
              stats: null,
            };
          }
        })
      );

      const updatedStats: Record<string, MonitorStats> = {};

      statsResults.forEach((item) => {
        if (item.stats) {
          updatedStats[item.id] = item.stats;
        }
      });

      setStatsByMonitor(updatedStats);
    } catch {
      setError("Unable to connect to API Sentinel backend.");
    } finally {
      setLoading(false);
    }
  };

  // Add a new monitor
  const handleAddMonitor = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await axios.post(`${API}/api/monitors`, formData);

      setFormData({
        name: "",
        url: "",
        method: "GET",
        interval_seconds: 60,
        timeout_seconds: 10,
      });

      setShowForm(false);
      await fetchMonitors();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(
          typeof detail === "string"
            ? detail
            : "Failed to create monitor. Please check your input."
        );
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Run a manual API check
  const handleManualCheck = async (monitorId: string) => {
    try {
      setCheckingId(monitorId);
      setError("");

      await axios.post(`${API}/api/monitors/${monitorId}/check`);
      await fetchMonitors();
    } catch {
      setError("Manual API check failed.");
    } finally {
      setCheckingId(null);
    }
  };

  // Pause or resume monitoring
  const handleToggleMonitor = async (monitorId: string) => {
    try {
      setTogglingId(monitorId);
      setError("");

      await axios.patch(`${API}/api/monitors/${monitorId}/toggle`);
      await fetchMonitors();
    } catch {
      setError("Unable to update monitor status.");
    } finally {
      setTogglingId(null);
    }
  };

  // Load monitor history
  const handleViewHistory = async (monitor: Monitor) => {
    try {
      setSelectedMonitor(monitor);
      setHistoryData(null);
      setHistoryError("");
      setHistoryLoading(true);

      const response = await axios.get(
        `${API}/api/monitors/${monitor.id}/history`
      );

      setHistoryData(response.data);
    } catch {
      setHistoryError("Unable to load monitor history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setSelectedMonitor(null);
    setHistoryData(null);
    setHistoryError("");
  };

  useEffect(() => {
    fetchMonitors();

    const timer = setInterval(fetchMonitors, 15000);
    return () => clearInterval(timer);
  }, []);

  // Dashboard calculations
  const activeCount = monitors.filter(
    (monitor) => monitor.is_active
  ).length;

  const inactiveCount = monitors.length - activeCount;
  const allStats = Object.values(statsByMonitor);

  const totalChecks = allStats.reduce(
    (sum, item) => sum + item.total_checks,
    0
  );

  const successfulChecks = allStats.reduce(
    (sum, item) => sum + item.successful_checks,
    0
  );

  const overallUptime =
    totalChecks > 0
      ? (successfulChecks / totalChecks) * 100
      : 0;

  // Weighted average response time across successful checks
  const totalSuccessfulResponseTime = allStats.reduce(
    (sum, item) =>
      sum +
      (item.average_response_time_ms ?? 0) *
        item.successful_checks,
    0
  );

  const overallAverageResponse =
    successfulChecks > 0
      ? totalSuccessfulResponseTime / successfulChecks
      : 0;

  // Prepare chart data
  const chartData =
    historyData?.history
      .slice()
      .reverse()
      .filter((record) => record.response_time_ms !== null)
      .map((record) => ({
        time: new Date(record.checked_at).toLocaleTimeString(),
        responseTime: record.response_time_ms,
      })) ?? [];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <Activity size={28} />
          <span>API Sentinel</span>
        </div>

        <nav>
          <div className="nav-item active">
            <Server size={19} />
            Dashboard
          </div>
        </nav>

        <div className="sidebar-footer">
          <span className="online-dot"></span>
          Monitoring platform
        </div>
      </aside>

      <main className="main-content">
        {/* Header */}
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Monitor your APIs in real time.</p>
          </div>

          <button
            className="refresh-button"
            onClick={fetchMonitors}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        {/* Dashboard overview */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Globe size={22} />
            </div>
            <p>Total Monitors</p>
            <h2>{monitors.length}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <CheckCircle size={22} />
            </div>
            <p>Active Monitors</p>
            <h2>{activeCount}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">
              <XCircle size={22} />
            </div>
            <p>Inactive Monitors</p>
            <h2>{inactiveCount}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <Activity size={22} />
            </div>
            <p>Overall Uptime</p>
            <h2 className="status-text">
              {overallUptime.toFixed(2)}%
            </h2>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">
              <Timer size={22} />
            </div>
            <p>Average Response</p>
            <h2>
              {successfulChecks > 0
                ? `${overallAverageResponse.toFixed(2)} ms`
                : "—"}
            </h2>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <CheckCircle size={22} />
            </div>
            <p>Total Checks</p>
            <h2>{totalChecks}</h2>
          </div>
        </section>

        {/* Monitor table */}
        <section className="monitor-section">
          <div className="section-header">
            <div>
              <h2>API Monitors</h2>
              <p>All registered endpoints</p>
            </div>

            <button
              className="add-button"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus size={18} />
              {showForm ? "Close Form" : "Add Monitor"}
            </button>
          </div>

          {/* Add monitor form */}
          {showForm && (
            <form
              className="monitor-form"
              onSubmit={handleAddMonitor}
            >
              <h3>Register a New API Monitor</h3>

              <div className="form-grid">
                <label>
                  Monitor Name
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="My API"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  API URL
                  <input
                    type="url"
                    required
                    placeholder="https://api.example.com"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        url: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  HTTP Method
                  <select
                    value={formData.method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        method: e.target.value,
                      })
                    }
                  >
                    <option value="GET">GET</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </label>

                <label>
                  Interval (seconds)
                  <input
                    type="number"
                    min={60}
                    max={3600}
                    required
                    value={formData.interval_seconds}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interval_seconds: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label>
                  Timeout (seconds)
                  <input
                    type="number"
                    min={2}
                    max={30}
                    required
                    value={formData.timeout_seconds}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeout_seconds: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Save Monitor"}
                </button>
              </div>
            </form>
          )}

          {loading && (
            <p className="message">Loading monitors...</p>
          )}

          {error && (
            <p className="error-message">{error}</p>
          )}

          {!loading && !error && monitors.length === 0 && (
            <p className="message">
              No monitors registered yet.
            </p>
          )}

          {!loading && monitors.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Monitor</th>
                    <th>Method</th>
                    <th>Interval</th>
                    <th>Status</th>
                    <th>Uptime</th>
                    <th>Avg Response</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {monitors.map((monitor) => {
                    const stats = statsByMonitor[monitor.id];

                    return (
                      <tr key={monitor.id}>
                        <td>
                          <div className="monitor-name">
                            <Globe size={18} />
                            <div>
                              <strong>{monitor.name}</strong>
                              <small>{monitor.url}</small>
                            </div>
                          </div>
                        </td>

                        <td>{monitor.method}</td>

                        <td>
                          <Clock
                            size={14}
                            className="inline-icon"
                          />
                          {monitor.interval_seconds}s
                        </td>

                        <td>
                          <span
                            className={
                              monitor.is_active
                                ? "status-badge active-status"
                                : "status-badge inactive-status"
                            }
                          >
                            {monitor.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="metric-cell">
                            <Gauge size={15} />
                            {stats
                              ? `${stats.uptime_percentage.toFixed(2)}%`
                              : "Loading..."}
                          </div>
                        </td>

                        <td>
                          <div className="metric-cell">
                            <Timer size={15} />
                            {stats?.average_response_time_ms !==
                              null &&
                            stats?.average_response_time_ms !==
                              undefined
                              ? `${stats.average_response_time_ms.toFixed(2)} ms`
                              : stats
                                ? "No data"
                                : "Loading..."}
                          </div>
                        </td>

                        <td>
                          {new Date(
                            monitor.created_at
                          ).toLocaleDateString()}
                        </td>

                        <td>
                          <div className="monitor-actions">
                            <button
                              className="check-button"
                              onClick={() =>
                                handleManualCheck(monitor.id)
                              }
                              disabled={checkingId === monitor.id}
                            >
                              {checkingId === monitor.id
                                ? "Checking..."
                                : "Check Now"}
                            </button>

                            <button
                              className={
                                monitor.is_active
                                  ? "pause-button"
                                  : "resume-button"
                              }
                              onClick={() =>
                                handleToggleMonitor(monitor.id)
                              }
                              disabled={togglingId === monitor.id}
                            >
                              {togglingId === monitor.id
                                ? "Updating..."
                                : monitor.is_active
                                  ? "Pause"
                                  : "Resume"}
                            </button>

                            <button
                              className="history-button"
                              onClick={() =>
                                handleViewHistory(monitor)
                              }
                            >
                              <Eye size={14} />
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* History modal */}
        {selectedMonitor && (
          <div
            className="modal-overlay"
            onClick={closeHistory}
          >
            <div
              className="history-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="history-header">
                <div>
                  <h2>{selectedMonitor.name}</h2>
                  <p>API Performance History</p>
                </div>

                <button
                  className="close-modal"
                  onClick={closeHistory}
                  aria-label="Close history"
                >
                  <X size={20} />
                </button>
              </div>

              {historyLoading && (
                <p className="message">Loading history...</p>
              )}

              {historyError && (
                <p className="error-message">
                  {historyError}
                </p>
              )}

              {historyData && (
                <>
                  <div className="history-stats">
                    <div>
                      <span>Total Checks</span>
                      <strong>
                        {historyData.total_results}
                      </strong>
                    </div>

                    <div>
                      <span>Successful</span>
                      <strong>
                        {historyData.history.filter(
                          (h) => h.is_success
                        ).length}
                      </strong>
                    </div>

                    <div>
                      <span>Failed</span>
                      <strong>
                        {historyData.history.filter(
                          (h) => !h.is_success
                        ).length}
                      </strong>
                    </div>
                  </div>

                  <h3>Response Time Trend</h3>

                  <div className="history-chart">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <LineChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#334155"
                          />

                          <XAxis
                            dataKey="time"
                            stroke="#94a3b8"
                          />

                          <YAxis stroke="#94a3b8" />

                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#111d33",
                              border: "1px solid #334155",
                              borderRadius: "8px",
                              color: "#fff",
                            }}
                            formatter={(value) => [
                              `${Number(value).toFixed(2)} ms`,
                              "Response Time",
                            ]}
                          />

                          <Line
                            type="monotone"
                            dataKey="responseTime"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            name="Response Time"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="message">
                        No response-time data available.
                      </p>
                    )}
                  </div>

                  <h3>Recent Checks</h3>

                  <div className="history-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Status Code</th>
                          <th>Response Time</th>
                          <th>Result</th>
                        </tr>
                      </thead>

                      <tbody>
                        {historyData.history.map(
                          (record, index) => (
                            <tr
                              key={`${record.checked_at}-${index}`}
                            >
                              <td>
                                {new Date(
                                  record.checked_at
                                ).toLocaleString()}
                              </td>

                              <td>
                                {record.status_code ?? "—"}
                              </td>

                              <td>
                                {record.response_time_ms !== null
                                  ? `${record.response_time_ms} ms`
                                  : "—"}
                              </td>

                              <td>
                                <span
                                  className={
                                    record.is_success
                                      ? "status-badge active-status"
                                      : "status-badge inactive-status"
                                  }
                                >
                                  {record.is_success
                                    ? "Success"
                                    : "Failed"}
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
