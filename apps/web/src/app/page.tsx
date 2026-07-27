export default function HalamanUtama() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 28, margin: 0 }}>Altora Resto</h1>
      <p style={{ fontSize: 16, color: "#555", maxWidth: 480, margin: 0 }}>
        Sistem operasional restoran multi-tenant/multi-outlet sedang dalam
        tahap pengembangan fondasi (schema database, kontrak API, dan
        correction loop arsitektur). Belum ada fitur produksi yang berjalan
        di sini.
      </p>
    </main>
  );
}
