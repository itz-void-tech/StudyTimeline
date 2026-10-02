import { Plus, Play, Trash2, Flame } from 'lucide-react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { formatTime } from '../utils';
import { useEffect, useRef, useState } from 'react';

export default function HomePage() {
  const store = useStore();
  const cleanupRan = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-cleanup orphaned subjects (runs only ONCE after first load)
  useEffect(() => {
    if (store.loading || cleanupRan.current) return;
    cleanupRan.current = true;
    const orphans = store.subjects.filter(sub => !store.lectures.some(l => l.subjectId === sub.id));
    if (orphans.length > 0) {
      console.log(`Cleaning up ${orphans.length} orphaned subjects...`);
      Promise.all(orphans.map(sub => store.deleteSubject(sub.id).catch(() => {})));
    }
  }, [store.loading]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning!';
    if (hour >= 12 && hour < 17) return 'Good Afternoon!';
    return 'Good Evening!';
  };

  const todayStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).replace(/,/g, '');

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Productivity & Streak calculation
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const segmentsToday = store.segments.filter(s => s.createdAt > startOfDay.getTime()).length;
  const goal = 10; // daily goal of 10 segments
  const progressPercent = Math.min(100, Math.round((segmentsToday / goal) * 100));

  // Streak logic based on segments created
  const activeDates = new Set(
    store.segments.map(s => {
      const d = new Date(s.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let currentStreak = 0;
  let tempDate = new Date(startOfDay);
  
  if (activeDates.has(tempDate.getTime())) {
    currentStreak++;
    tempDate.setDate(tempDate.getDate() - 1);
  } else {
    tempDate.setDate(tempDate.getDate() - 1);
  }

  while (activeDates.has(tempDate.getTime())) {
    currentStreak++;
    tempDate.setDate(tempDate.getDate() - 1);
  }

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(startOfDay);
    date.setDate(date.getDate() - (6 - i));
    return {
      date,
      isActive: activeDates.has(date.getTime()),
      isToday: date.getTime() === startOfDay.getTime()
    };
  });

  const handleDeleteSubject = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await store.deleteSubject(id);
      } catch (err) {
        console.error('Failed to delete subject:', err);
      }
    }
  };

  if (store.loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-muted text-sm">Loading your study library...</p>
      </div>
    </div>
  );

  const recentLectures = [...store.lectures]
    .sort((a, b) => {
      const aTime = a.lastWatchedAt || a.createdAt;
      const bTime = b.lastWatchedAt || b.createdAt;
      return bTime - aTime;
    })
    .slice(0, 5);
  
  const subjectsWithCounts = store.subjects.map(sub => ({
    ...sub,
    lectureCount: store.lectures.filter(l => l.subjectId === sub.id).length
  }));

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-bg-tertiary to-bg-secondary p-8 md:p-10 border border-border shadow-2xl">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight animate-in slide-in-from-bottom-4 fade-in duration-700">
              {getGreeting()}
            </h2>
            <p className="text-text-secondary text-lg animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150">
              Continue your learning journey. You've marked <strong className="text-white">{segmentsToday}</strong> segment{segmentsToday !== 1 ? 's' : ''} today.
            </p>
            
            {/* Productivity Bar */}
            <div className="mt-8 max-w-md animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300">
              <div className="flex justify-between text-sm font-medium text-text-muted mb-2">
                <span>Daily Goal: {goal} segments</span>
                <span className="text-accent">{progressPercent}% Achieved</span>
              </div>
              <div className="h-2.5 bg-bg-primary/80 rounded-full overflow-hidden border border-border/50 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-accent to-blue-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--color-accent),0.5)]" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>
          </div>
          
          {/* Right Side: Clock & Streak */}
          <div className="flex flex-col gap-4 shrink-0 w-full lg:w-[320px] xl:w-[350px] animate-in slide-in-from-right-8 fade-in duration-1000">
            {/* Real-time Clock */}
            <div className="flex flex-col items-end bg-bg-primary/40 backdrop-blur-xl px-6 py-5 rounded-2xl border border-border/50 shadow-xl">
              <div className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-1 font-mono drop-shadow-md">
                {timeStr}
              </div>
              <div className="text-sm font-semibold text-text-muted uppercase tracking-widest">
                {todayStr}
              </div>
            </div>

            {/* Streak Calendar */}
            <div className="bg-bg-primary/40 backdrop-blur-xl px-6 py-5 rounded-2xl border border-border/50 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Activity Streak</span>
                <div className="flex items-center gap-1.5 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
                  <Flame className={`w-3.5 h-3.5 text-orange-500 ${currentStreak > 0 ? 'animate-pulse' : 'opacity-50'}`} />
                  <span className="text-xs font-bold text-orange-500">{currentStreak} Day{currentStreak !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              <div className="flex justify-between gap-1 w-full">
                {last7Days.map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[9px] font-bold ${day.isToday ? 'text-accent' : 'text-text-muted'}`}>
                      {day.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </span>
                    <div 
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0 ${
                        day.isActive 
                          ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] scale-110' 
                          : 'bg-bg-tertiary border border-border'
                      }`}
                    >
                      {day.isActive && <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
      {subjectsWithCounts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold">Subjects</h3>
            <Link to="/library" className="text-sm text-accent hover:text-accent-hover font-medium">View All</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjectsWithCounts.map(sub => (
              <Link key={sub.id} to={`/library/${sub.id}`} className="block group">
                <div className="bg-bg-secondary border border-border p-5 rounded-2xl hover:border-border transition-all hover:shadow-lg cursor-pointer h-full relative overflow-hidden"
                     onMouseEnter={e => e.currentTarget.style.borderColor = sub.color}
                     onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500" style={{ color: sub.color }} />
                  
                  <button 
                    onClick={(e) => handleDeleteSubject(e, sub.id)}
                    className="absolute top-3 right-3 p-1.5 bg-bg-primary/80 backdrop-blur rounded-lg text-text-muted hover:text-importance-critical opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <span className="text-3xl">{sub.icon}</span>
                    <h4 className="font-semibold text-text-primary text-base group-hover:text-white transition-colors">{sub.name}</h4>
                  </div>
                  <p className="text-sm text-text-muted group-hover:text-text-secondary transition-colors relative z-10">{sub.lectureCount} lectures</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Lectures */}
      <section>
        <h3 className="text-lg font-semibold mb-5">Recently Watched Lectures</h3>
        <div className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6 lg:mx-0 lg:px-0">
          
          {/* CTA Card */}
          <div className="min-w-[280px] w-[280px] shrink-0 bg-bg-secondary/50 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-accent hover:bg-bg-secondary transition-all group h-[220px]"
               onClick={() => window.dispatchEvent(new Event('open-add-modal'))}
          >
            <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-accent/20">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-medium text-text-primary">Add New Lecture</h4>
            <p className="text-sm text-text-muted mt-1">Paste a YouTube URL to begin</p>
          </div>

          {/* Lecture Cards */}
          {recentLectures.map(lecture => {
            const subject = store.subjects.find(s => s.id === lecture.subjectId);
            const watchProgress = lecture.duration > 0 && lecture.lastWatchedPosition 
              ? Math.min(100, (lecture.lastWatchedPosition / lecture.duration) * 100) 
              : 0;

            return (
              <Link key={lecture.id} to={`/lecture/${lecture.id}`} className="min-w-[300px] w-[300px] shrink-0 bg-bg-secondary rounded-2xl overflow-hidden border border-border group cursor-pointer hover:border-accent transition-colors block h-[220px] flex flex-col relative">
                <div className="relative h-[130px] bg-bg-tertiary shrink-0">
                  <img src={lecture.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-300">
                      <Play className="w-5 h-5 text-white ml-1" />
                    </div>
                  </div>
                  {lecture.duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[11px] font-mono text-white/90">
                      {lecture.lastWatchedPosition ? `${formatTime(lecture.lastWatchedPosition)} / ` : ''}{formatTime(lecture.duration)}
                    </div>
                  )}
                  {/* Progress Line */}
                  {watchProgress > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50 z-20">
                      <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${watchProgress}%` }} />
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h4 className="font-medium text-[15px] leading-snug line-clamp-2 mb-auto group-hover:text-accent transition-colors">{lecture.title}</h4>
                  <div className="mt-3 flex items-center justify-between">
                    {subject && (
                      <span className="text-[11px] font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                        {subject.icon} {subject.name}
                      </span>
                    )}
                    <span className="text-xs text-text-muted">{lecture.totalSegments || 0} segments</span>
                  </div>
                </div>
              </Link>
            );
          })}

          {recentLectures.length === 0 && (
            <div className="min-w-[280px] w-[280px] shrink-0 bg-bg-secondary/30 rounded-2xl border border-border flex items-center justify-center p-6 text-center text-text-muted text-sm h-[220px]">
              No lectures yet. Add your first one!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
