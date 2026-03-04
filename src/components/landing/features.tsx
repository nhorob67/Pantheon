export function ConversationShowcase() {
  return (
    <section className="showcase" id="skills">
      <div className="showcase-header">
        <div className="section-label">See It In Action</div>
        <h2 className="section-title">One team. Every question your operation throws at it.</h2>
        <p className="section-sub">No dashboards. No apps to switch between. Just ask what you need — your team handles the rest.</p>
      </div>

      <div className="convo-grid">
        <div className="convo-card featured">
          <div className="convo-category"><span className="icon">🌾</span> Grain Marketing</div>
          <div className="convo-message user">
            <div className="sender">You</div>
            <div className="bubble">What&apos;s corn at today?</div>
          </div>
          <div className="convo-message assistant">
            <div className="sender">FarmClaw</div>
            <div className="bubble">
              <strong>Cash Corn Bids — Feb 11, 9:15 AM</strong><br /><br />
              CHS Fargo: <span className="price">$4.52</span> (basis -35 Mar)<br />
              ADM Casselton: <span className="price">$4.48</span> (basis -39 Mar)<br />
              Cargill West Fargo: <span className="price">$4.55</span> (basis -32 Mar)<br /><br />
              Cargill has the best bid today, 7¢ over ADM. Basis has narrowed 3¢ this week across the board.
            </div>
          </div>
          <div className="convo-message user" style={{ marginTop: 8 }}>
            <div className="sender">You</div>
            <div className="bubble">How about beans?</div>
          </div>
          <div className="convo-message assistant">
            <div className="sender">FarmClaw</div>
            <div className="bubble">
              <strong>Cash Soybean Bids</strong><br /><br />
              CHS Fargo: <span className="price">$10.15</span> (basis -55 Mar)<br />
              ADM Casselton: <span className="price">$10.22</span> (basis -48 Mar)<br />
              Cargill West Fargo: <span className="price">$10.18</span> (basis -52 Mar)<br /><br />
              ADM is paying the best basis on beans by 4-7¢.
            </div>
          </div>
        </div>

        <div className="convo-card">
          <div className="convo-category"><span className="icon">⛅</span> Weather / Spray Windows</div>
          <div className="convo-message user">
            <div className="sender">You</div>
            <div className="bubble">Spray window tomorrow?</div>
          </div>
          <div className="convo-message assistant">
            <div className="sender">FarmClaw</div>
            <div className="bubble">
              <strong>🟢 Good window 6AM–11AM</strong><br />
              Wind 5-8 mph SW, 62-71°F, 0% precip<br /><br />
              <strong>🔴 Avoid 1PM–5PM</strong><br />
              Wind gusting 18-22 mph<br /><br />
              <strong>🟡 Marginal 6PM–8PM</strong><br />
              Wind drops to 4 mph — inversion risk after sunset
            </div>
          </div>
        </div>

        <div className="convo-card">
          <div className="convo-category"><span className="icon">🧾</span> Scale Tickets</div>
          <div className="convo-message user">
            <div className="sender">You</div>
            <div className="bubble">Just dropped off a load at CHS</div>
            <div className="attachment">📎 scale-ticket.jpg</div>
          </div>
          <div className="convo-message assistant">
            <div className="sender">FarmClaw</div>
            <div className="bubble">
              Got it. Here&apos;s what I pulled from the ticket:<br /><br />
              <strong>Corn</strong> — CHS Fargo, Feb 12<br />
              Gross: 67,240 lbs / Tare: 33,100 lbs / <strong>Net: 610.0 bu</strong> @ 56 lb<br />
              Moisture: 14.2% · Test weight: 57.8 lb/bu · Dockage: 0.3%<br /><br />
              Want me to log this?
            </div>
          </div>
        </div>

        <div className="convo-card" style={{ background: "var(--accent-dim)", borderColor: "rgba(217, 140, 46, 0.2)" }}>
          <div className="convo-category" style={{ color: "var(--accent-light)" }}><span className="icon">✦</span> Anything Else</div>
          <div className="convo-message user">
            <div className="sender">You</div>
            <div className="bubble">Compare ARC-CO vs PLC for corn in Cass County at a $4.50 projected price</div>
          </div>
          <div className="convo-message assistant">
            <div className="sender">FarmClaw</div>
            <div className="bubble">
              I&apos;ll look at the county benchmarks and run the comparison...<br /><br />
              Crop insurance deadlines, equipment costs, landlord letters, agronomy questions — your team handles whatever you throw at it.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
