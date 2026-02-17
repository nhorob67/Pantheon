export function ConversationShowcase() {
  return (
    <section className="showcase" id="skills">
      <div className="showcase-header">
        <div className="section-label">What You Can Ask</div>
        <h2 className="section-title">One assistant. Every question your farm throws at you.</h2>
        <p className="section-sub">FarmClaw doesn&apos;t have a fixed menu. Ask it whatever you need — it figures out how to help.</p>
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
          <div className="convo-category"><span className="icon">⛅</span> Weather</div>
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
          <div className="convo-category"><span className="icon">📋</span> Programs &amp; Deadlines</div>
          <div className="convo-message user">
            <div className="sender">You</div>
            <div className="bubble">When&apos;s the ARC/PLC signup deadline?</div>
          </div>
          <div className="convo-message assistant">
            <div className="sender">FarmClaw</div>
            <div className="bubble">
              ARC/PLC enrollment for the 2026 crop year closes <strong>March 15, 2026</strong>. Your county FSA office in Cass County has walk-in hours Tues-Thurs. Want me to remind you a week before?
            </div>
          </div>
        </div>

        <div className="convo-card">
          <div className="convo-category"><span className="icon">📊</span> Market Intel</div>
          <div className="convo-message user">
            <div className="sender">You</div>
            <div className="bubble">How has my basis trended this month?</div>
          </div>
          <div className="convo-message assistant">
            <div className="sender">FarmClaw</div>
            <div className="bubble">
              Corn basis at CHS Fargo over the last 14 days:<br /><br />
              Feb 1: <strong>-42</strong> → Feb 11: <strong>-35</strong><br /><br />
              That&apos;s a 7¢ improvement. Basis has tightened steadily since the Feb WASDE showed lower carry-out estimates. If you&apos;re sitting on grain, this trend is favorable.
            </div>
          </div>
        </div>

        <div className="convo-card">
          <div className="convo-category"><span className="icon">🚜</span> Operations</div>
          <div className="convo-message user">
            <div className="sender">You</div>
            <div className="bubble">Draft a message to Dale about the land rent payment being 2 weeks late</div>
          </div>
          <div className="convo-message assistant">
            <div className="sender">FarmClaw</div>
            <div className="bubble">
              Here&apos;s a draft:<br /><br />
              <em>&ldquo;Hi Dale — wanted to give you a heads up that the rent payment for the NE quarter will be about two weeks behind this year. Waiting on a couple grain settlements to clear. Should have it to you by the 25th. Let me know if that&apos;s an issue. Thanks.&rdquo;</em><br /><br />
              Want me to adjust the tone or send it?
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
              Your assistant can research, calculate, and draft — just ask.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
