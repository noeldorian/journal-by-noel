export interface TradingQuote {
  text: string;
  author: string;
}

// A curated set of short, widely-quoted lines on trading psychology,
// discipline, and risk — the same rotation every trader sees on a given
// calendar day (see quoteOfTheDay below), not a random reshuffle on refresh.
export const TRADING_QUOTES: TradingQuote[] = [
  { text: "The elements of good trading are cutting losses, cutting losses, and cutting losses.", author: "Ed Seykota" },
  { text: "It's not whether you're right or wrong, but how much money you make when you're right and how much you lose when you're wrong.", author: "George Soros" },
  { text: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder" },
  { text: "Markets are never wrong — opinions often are.", author: "Jesse Livermore" },
  { text: "Amateurs think about how much money they can make. Professionals think about how much money they could lose.", author: "Jack Schwager" },
  { text: "The most important quality for a trader is the ability to accept a loss without emotion.", author: "Mark Douglas" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { text: "In trading, the impossible happens about twice a year.", author: "Henri Simoes" },
  { text: "Your biggest trading enemy isn't the market — it's your own emotions.", author: "Paul Tudor Jones" },
  { text: "I'm always thinking about losing money as opposed to making money. Don't focus on making money; focus on protecting what you have.", author: "Paul Tudor Jones" },
  { text: "The market can stay irrational longer than you can stay solvent.", author: "John Maynard Keynes" },
  { text: "Whenever I enter a position, I have a predetermined stop. That is the only way I can sleep.", author: "Bruce Kovner" },
  { text: "Consistency is what separates a professional from an amateur — not any one trade.", author: "Linda Raschke" },
  { text: "Every day I assume every position I have is wrong.", author: "Paul Tudor Jones" },
  { text: "The desire for constant action irrespective of underlying conditions is responsible for many losses in Wall Street.", author: "Jesse Livermore" },
  { text: "There is nothing better than a big loss to help one make a good decision.", author: "Paul Tudor Jones" },
  { text: "Trading is not about being right. It's about managing being wrong.", author: "Ed Seykota" },
  { text: "The trend is your friend until the end when it bends.", author: "Ed Seykota" },
  { text: "You have to treat trading as if it's a business, not a hobby and not a job.", author: "Mark Douglas" },
  { text: "Good traders manage the downside; they don't worry about the upside.", author: "Bruce Kovner" },
  { text: "If you can't take a small loss, sooner or later you will take the mother of all losses.", author: "Ed Seykota" },
  { text: "A trader who has a great trading system but no discipline is at a disadvantage to a trader with a mediocre system and great discipline.", author: "Michael Marcus" },
  { text: "Emotional control is the single most important factor in trading success.", author: "Alexander Elder" },
  { text: "Patience is the single most important thing a new trader must learn.", author: "Ray Dalio" },
  { text: "The four most dangerous words in investing are: this time it's different.", author: "Sir John Templeton" },
  { text: "In this business if you're good, you're right six times out of ten. You're never going to be right nine times out of ten.", author: "Peter Lynch" },
  { text: "Losing an acceptable amount is trading. Losing an unacceptable amount is gambling.", author: "Unknown" },
  { text: "Plan your trade and trade your plan.", author: "Trading floor adage" },
  { text: "It's not the will to win that matters — everyone has that. It's the will to prepare to win that matters.", author: "Paul \"Bear\" Bryant" },
  { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "The elements of a good position — small enough to sleep at night, big enough to make a difference.", author: "Bruce Kovner" },
  { text: "What seems too high and risky to the majority generally goes higher, and what seems low and cheap generally goes lower.", author: "William O'Neil" },
  { text: "Do more of what works and less of what doesn't.", author: "Steve Clark" },
  { text: "The market is a mechanism for the transference of wealth from the impatient to the patient.", author: "Buffett-school adage" },
  { text: "Successful trading is about identifying and managing risk, not eliminating it.", author: "Larry Hite" },
  { text: "I don't think you can consistently be a winning trader if you're banking on being right more than 50% of the time.", author: "Larry Hite" },
  { text: "Being wrong is acceptable, but staying wrong is unacceptable.", author: "Martin Zweig" },
  { text: "The key to trading success is emotional discipline. If intelligence were the key, there would be a lot more people making money trading.", author: "Victor Sperandeo" },
  { text: "Fear and greed are two of the biggest emotions that fuel the market — trade your process, not your feelings.", author: "Unknown" },
  { text: "Sometimes the most important thing to do is nothing at all.", author: "Jesse Livermore" },
];

// A stable per-day index — the djb2 string hash, reduced mod list length —
// so everyone sees the same quote on the same calendar date and it changes
// at midnight local time rather than on every page load.
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function quoteOfTheDay(dateStr: string, quotes: TradingQuote[] = TRADING_QUOTES): TradingQuote {
  const index = hashString(dateStr) % quotes.length;
  return quotes[index];
}
