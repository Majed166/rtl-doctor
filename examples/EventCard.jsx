import { ChevronRight } from 'lucide-react';

export function EventCard({ event }) {
  const box = event.rect.left - 5; // normal code, should not be reported

  return (
    <div className="relative ml-4 pr-2 text-left rounded-l-lg border-l-4 md:mr-8">
      <span className="absolute right-0 -left-2" style={{ marginLeft: 8, textAlign: 'right' }}>
        {event.title}
      </span>
      <div className="flex space-x-2">
        <input type="tel" name="phone" />
        <input type="email" name="email" dir="ltr" />
      </div>
      <a href={event.url}>
        Details <ChevronRight />
      </a>
    </div>
  );
}
