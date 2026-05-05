export default function Home() {
  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>🔔 Campus Notification Platform - Backend API</h1>
      <p>Server is running. Available endpoints:</p>
      <ul>
        <li>GET /api/v1/notifications</li>
        <li>GET /api/v1/notifications/unread-count</li>
        <li>GET /api/v1/notifications/priority</li>
        <li>GET /api/v1/notifications/stream (SSE)</li>
        <li>POST /api/v1/notifications</li>
        <li>POST /api/v1/notifications/broadcast</li>
        <li>PATCH /api/v1/notifications/:id/read</li>
        <li>PATCH /api/v1/notifications/read-all</li>
      </ul>
    </main>
  );
}
