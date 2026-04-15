"use client";

import { useEffect, useState } from "react";

const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}/api/settings_app/`;

type Setting = {
  id: number;
  google_analytics_id: string;
};

export default function SettingsPage() {
  const [settingId, setSettingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    
    google_analytics_id: "",
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>("");

  // LOAD DATA
  const loadSettings = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
  
    // take ONLY first record
    if (data.length > 0) {
      setSettingId(data[0].id);
      setForm({
        google_analytics_id: data[0].google_analytics_id,
      });
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // CREATE / UPDATE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
  
    try {
      let res;
  
      if (settingId) {
        // UPDATE existing
        res = await fetch(`${API_URL}${settingId}/update/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        // FIRST TIME CREATE ONLY
        res = await fetch(`${API_URL}create/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
  
      if (!res.ok) throw new Error("Failed");
  
      await loadSettings(); // reload single value
      setSuccessMsg("Settings saved successfully ✅");
    } catch (error) {
      console.error(error);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  // EDIT
//   const handleEdit = (item: Setting) => {
//     setForm({
      
//       google_analytics_id: item.google_analytics_id,
//     });
//     setEditId(item.id);
//   };

  // DELETE
//   const handleDelete = async (id: number) => {
//     await fetch(`${API_URL}${id}/delete/`, {
//       method: "DELETE",
//     });

//     loadSettings();
//   };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">
        Settings - Google Analytics
      </h1>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-8">
        

        <input
          className="border p-2 w-full rounded"
          placeholder="Google Analytics ID (G-XXXX)"
          value={form.google_analytics_id}
          onChange={(e) =>
            setForm({ ...form, google_analytics_id: e.target.value })
          }
        />

        <button
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
        {loading ? "Saving..." : editId ? "Update" : "Save"}
        </button>
        {successMsg && (
            <p className="text-green-600 text-sm mt-2">
                {successMsg}
            </p>
        )}
      </form>

      {/* LIST */}
      {/* <div className="space-y-3">
        {settings.map((item) => (
          <div
            key={item.id}
            className="border p-4 rounded flex justify-between"
          >
            <div>
              
              <p className="text-sm text-gray-500">
                {item.google_analytics_id}
              </p>
            </div>

            <div className="space-x-2">
              <button
                onClick={() => handleEdit(item)}
                className="bg-yellow-500 text-white px-3 py-1 rounded"
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(item.id)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div> */}
    </div>
  );
}