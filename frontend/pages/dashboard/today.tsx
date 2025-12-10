import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Task = {
  id: string;
  type: string;
  status: string;
  application_id: string;
  due_at: string;
};

export default function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingid, setUpdatingid] = useState<string | null>(null);

  const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  };

  async function fetchTasks() {
    setLoading(true);
    setError(null);

    const{ startIso, endIso } = getTodayRange();

    const {data, error} = await supabase
      .from("tasks")
      .select("id, applcation_id, type, status, due_at")
      .gte("due_at", startIso)
      .lt("due_at", endIso)
      .neq("status", "completed")
      .order("due_at", { ascending: true });

      if (error) {
        console.error("Error fetching tasks", error);
        setError("Failed to load tasks");
        setTasks([]);
      }else{
        setTasks(data ?? []);
      }

      setLoading(false);
  }

  const handleMarkComplete = async (taskId: string) => { 
    setUpdatingid(taskId);

    const { error } = await supabase
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", taskId);

    if(error){
      console.error("Error updating task", error);
      alert("Failed to update task");
    }else{
      setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
    }

    setUpdatingid(null);

  }

  useEffect(() => {
      fetchTasks();
    }, []);
  


  

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

   return (
    <main style={{ padding: "2rem" }}>
      <h1>Tasks Due Today</h1>

      {tasks.length === 0 && <p>No tasks due today.</p>}

      {tasks.length > 0 && (
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Type</th>
              <th style={th}>Application ID</th>
              <th style={th}>Due At</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                <td style={td}>{task.type}</td>
                <td style={td}>{task.application_id}</td>
                <td style={td}>{new Date(task.due_at).toLocaleString()}</td>
                <td style={td}>{task.status}</td>
                <td style={td}>
                  <button
                    disabled={updatingid === task.id}
                    onClick={() => handleMarkComplete(task.id)}
                  >
                    {updatingid === task.id ? "Updating..." : "Mark Complete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

// table styles
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem",
  borderBottom: "2px solid #ccc",
};
const td: React.CSSProperties = {
  padding: "0.5rem",
  borderBottom: "1px solid #eee",
};
