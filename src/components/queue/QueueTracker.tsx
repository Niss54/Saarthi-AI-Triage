import { CheckCircle, Clock, PhoneCall, Stethoscope, CircleDot } from 'lucide-react';

interface Props {
  currentStatus: string;
  token: string;
  department?: string;
  roomNumber?: string;
}

const STEPS = [
  { key: 'registered', label: 'Registered', icon: CheckCircle },
  { key: 'waiting', label: 'In Queue', icon: Clock },
  { key: 'called', label: 'Called', icon: PhoneCall },
  { key: 'in-consultation', label: 'In Consultation', icon: Stethoscope },
  { key: 'done', label: 'Complete', icon: CircleDot },
];

const STATUS_ORDER = ['registered', 'waiting', 'called', 'in-consultation', 'done'];

export default function QueueTracker({ currentStatus, token, department, roomNumber }: Props) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const activeIndex = currentIndex >= 0 ? currentIndex : 1; // default to 'waiting'

  return (
    <div className="queue-tracker">
      <div className="queue-tracker-header">
        <span className="queue-tracker-token">🎫 {token}</span>
        {department && <span className="queue-tracker-dept">{department}</span>}
        {roomNumber && <span className="queue-tracker-room">Room: {roomNumber}</span>}
      </div>
      <div className="queue-tracker-timeline">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          const isPending = i > activeIndex;

          return (
            <div key={step.key} className={`timeline-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}>
              <div className={`timeline-icon ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                <Icon size={14} />
              </div>
              <span className="timeline-label">{step.label}</span>
              {i < STEPS.length - 1 && <div className={`timeline-line ${isDone ? 'done' : ''}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
