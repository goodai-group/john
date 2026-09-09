import React, { useMemo, useState } from 'react';
import { GraduationCap, PlayCircle, CheckCircle2, ExternalLink, Youtube, Film, Clock } from 'lucide-react';
import { Language } from '../types';
import { LEARNING_VIDEOS, LEARNING_CATEGORIES } from '../lib/learningVideos';
import { getLearningProgress, setVideoWatched } from '../lib/storage';

interface LearningCenterPageProps {
  language: Language;
}

export const LearningCenterPage: React.FC<LearningCenterPageProps> = ({ language }) => {
  const [progress, setProgress] = useState(() => getLearningProgress());
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const categories = useMemo(() => ['全部', ...LEARNING_CATEGORIES], []);

  const filteredVideos = useMemo(
    () =>
      activeCategory === '全部'
        ? LEARNING_VIDEOS
        : LEARNING_VIDEOS.filter((v) => v.category === activeCategory),
    [activeCategory]
  );

  const watchedCount = LEARNING_VIDEOS.filter((v) => progress[v.id]?.watched).length;
  const totalCount = LEARNING_VIDEOS.length;
  const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  const toggleWatched = (videoId: string) => {
    const isWatched = Boolean(progress[videoId]?.watched);
    const updated = setVideoWatched(videoId, !isWatched);
    setProgress(updated);
  };

  const handlePlay = (videoId: string, url: string) => {
    setPlayingVideoId(videoId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header + 进度条 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-teal-600" />
              {language === 'zh' ? '商业知识学习中心' : 'Business Knowledge Learning Center'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
              {language === 'zh'
                ? '不只是填表出报告——这里整理了成本核算、盈亏平衡、签证合规、现金流管理等商业基础知识短片，学多少、学到哪，系统都会帮你记住进度。'
                : 'Beyond filling out forms — curated videos on cost accounting, break-even, visa compliance, and cash flow. Your progress is tracked automatically.'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-3xl font-black text-teal-600">
              {watchedCount}/{totalCount}
            </div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              {language === 'zh' ? '已学完' : 'Completed'}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 font-semibold">
            {language === 'zh' ? `学习进度 ${progressPercent}%` : `Progress ${progressPercent}%`}
          </p>
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 视频网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((video) => {
          const isWatched = Boolean(progress[video.id]?.watched);
          const title = language === 'zh' ? video.titleZh : video.titleEn;
          const description = language === 'zh' ? video.descriptionZh : video.descriptionEn;

          return (
            <div
              key={video.id}
              className={`rounded-2xl border p-4 space-y-3 transition-all ${
                isWatched ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                  {video.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                  {video.source === 'youtube' ? (
                    <Youtube className="w-3 h-3 text-rose-500" />
                  ) : (
                    <Film className="w-3 h-3 text-teal-500" />
                  )}
                  {video.source === 'youtube'
                    ? 'YouTube'
                    : language === 'zh'
                    ? '站内视频'
                    : 'Platform Video'}
                </span>
              </div>

              <h3 className="text-sm font-black text-slate-900 leading-snug">{title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">{description}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  {video.durationMinutes} {language === 'zh' ? '分钟' : 'min'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePlay(video.id, video.url)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {language === 'zh' ? '观看' : 'Watch'}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWatched(video.id)}
                    title={
                      language === 'zh'
                        ? isWatched
                          ? '取消标记已学完'
                          : '标记为已学完'
                        : isWatched
                        ? 'Unmark as watched'
                        : 'Mark as watched'
                    }
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isWatched
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {playingVideoId === video.id && video.source === 'internal' && (
                <video
                  src={video.url}
                  controls
                  className="w-full rounded-xl mt-2 border border-slate-200"
                  onEnded={() => toggleWatched(video.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
