export function format(date: Date, formatString: string): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const minutesFormatted = minutes.toString().padStart(2, '0');

  // Handle common format strings
  switch (formatString) {
    case "MMM d, yyyy":
      return `${month} ${day}, ${year}`;
    case "MMM d, yyyy 'at' h:mm a":
      return `${month} ${day}, ${year} at ${hours12}:${minutesFormatted} ${ampm}`;
    default:
      return date.toLocaleDateString();
  }
}