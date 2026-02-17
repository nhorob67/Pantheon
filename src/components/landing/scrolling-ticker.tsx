const tickerItems = [
  "What's corn at CHS Fargo?",
  "Spray window tomorrow?",
  "Compare my soybean basis across all elevators",
  "Will it freeze this weekend?",
  "Remind me when prevent plant deadline hits",
  "What's the 7-day forecast?",
  "Summarize yesterday's WASDE report",
  "GDD accumulation since May 1?",
  "Draft a text to my landlord about rent",
  "When does FSA signup close?",
  "What's Dec corn futures at?",
  "Equipment maintenance due this month?",
  "Any severe weather alerts for Cass County?",
  "Break-even on corn at current input costs?",
  "Best elevator for spring wheat right now?",
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
