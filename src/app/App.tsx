export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">CivicForge</div>
        <nav>
          <a href="#dashboard">Dashboard</a>
          <a href="#library">Library</a>
          <a href="#review">Review</a>
          <a href="#rewrite">Rewrite</a>
          <a href="#settings">Settings</a>
        </nav>
      </aside>
      <section className="workspace" id="dashboard">
        <p className="eyebrow">申论素材库</p>
        <h1>CivicForge</h1>
        <p>
          Local-first materials, structured writing, and lightweight spaced
          review for civil service essay preparation.
        </p>
      </section>
      <aside className="inspector" aria-label="Properties panel">
        <h2>Properties</h2>
        <p>Phase one foundation is ready for the material editor.</p>
      </aside>
    </main>
  );
}
