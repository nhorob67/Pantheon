const tickerItems = [
  "What's corn at CHS today?",
  "Spray window tomorrow morning?",
  "Compare soybean basis across my elevators",
  "When does crop insurance signup close?",
  "Break-even on corn at current input costs?",
  "Summarize yesterday's WASDE report",
  "Draft a message to my landlord about rent",
  "GDD accumulation since May 1?",
  "Any severe weather alerts for Cass County?",
  "What equipment maintenance is due this month?",
  "Walk me through ARC-CO vs PLC for my county",
  "What's the 10-day forecast look like?",
  "How many bushels have I delivered this season?",
  "Pull up my scale tickets from last week",
  "What did Dec corn close at yesterday?",
];

export function ScrollingTicker() {
  return (
    <div className="ticker-section">
      <div className="ticker-track">
        {[...tickerItems, ...tickerItems].map((item, i) => (
          <span key={i} className="ticker-item">{item}</span>
        ))}
      </div>
    </div>
  );
}
