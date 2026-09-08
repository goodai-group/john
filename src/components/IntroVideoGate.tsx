import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SkipForward, Volume2, VolumeX, PlayCircle, ArrowRight, Heart } from 'lucide-react';
import { Language } from '../types';

const INTRO_STORAGE_KEY = 'bam_intro_video_seen';

/** 当前浏览器会话（同一标签页）是否已看过开场视频 */
export function hasSeenIntroVideo(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroVideoSeen(): void {
  try {
    window.sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
  } catch {
    // 隐私模式下 sessionStorage 不可用，忽略即可
  }
}

/**
 * 判断本次访问是否为「认证回跳」：
 * Google 登录整页跳转、邮箱验证链接、找回密码链接都会带 code / access_token / error 等参数回到本站。
 * 这类回跳（尤其是从邮件客户端新开的标签页）如果被开场视频挡住，
 * 用户会看不到登录结果、也找不到设置新密码的入口，因此直接放行。
 */
export function isAuthCallbackUrl(): boolean {
  try {
    const search = new URLSearchParams(window.location.search);
    if (
      search.has('code') ||
      search.has('error') ||
      search.has('error_code') ||
      search.has('error_description')
    ) {
      return true;
    }
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return ['access_token', 'refresh_token', 'error', 'error_code', 'type'].some((k) =>
      hash.has(k)
    );
  } catch {
    return false;
  }
}

const COPY = {
  zh: {
    brand: '商宣商业模式检验',
    slogan: '先看一分钟开场视频，三分钟看懂你的生意',
    watching: '开场视频播放中 · 看完或「跳过视频」后即可进入',
    skip: '跳过视频',
    enter: '进入网站',
    finishedTitle: '视频已播完',
    finishedSub: '现在，从一份 3 分钟的免费商业体检开始。',
    tapToPlay: '点击播放开场视频',
    tapHint: '浏览器拦截了自动播放，点击即可开始',
    loadFailed: '开场视频加载失败或网络较慢',
    loadFailedHint: '可以直接进入平台，不影响任何功能使用。',
    soundOn: '开启声音',
    soundOff: '静音',
    remaining: '剩余',
    sec: '秒'
  },
  en: {
    brand: 'BAM Business Model Check',
    slogan: 'Watch a 1-minute intro, then understand your business in 3 minutes',
    watching: 'Intro playing · Finish it or tap "Skip" to enter',
    skip: 'Skip video',
    enter: 'Enter site',
    finishedTitle: 'Intro finished',
    finishedSub: 'Now start your free 3-minute business check-up.',
    tapToPlay: 'Tap to play the intro video',
    tapHint: 'Autoplay was blocked by your browser',
    loadFailed: 'Intro video failed to load or network is slow',
    loadFailedHint: 'You can enter the platform directly — all features work normally.',
    soundOn: 'Sound on',
    soundOff: 'Mute',
    remaining: 'Left',
    sec: 's'
  }
} as const;

interface IntroVideoGateProps {
  language: Language;
  /** 看完 / 跳到片尾后回调，用于关闭遮罩并放行站点 */
  onFinish: () => void;
  videoSrc?: string;
}

/**
 * 网站开场视频门禁：
 * - 进入站点前全屏播放品牌视频；
 * - 只有【播放到片尾】或【用户手动跳到片尾】后才显示「进入网站」；
 * - 拖进度条快进到末尾同样视为看完；视频缺失/加载失败时不阻塞使用。
 */
export function IntroVideoGate({
  language,
  onFinish,
  videoSrc = '/intro.mp4'
}: IntroVideoGateProps) {
  const t = COPY[language];
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false); // 自动播放被浏览器拦截
  const [isMuted, setIsMuted] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    videoRef.current?.pause();
    setIsFinished(true);
    setIsPlaying(false);
  }, []);

  // 遮罩期间锁定页面滚动，避免"背后偷偷滑动"
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const attemptPlay = useCallback(async (withSound: boolean) => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !withSound;
    try {
      await v.play();
      setIsMuted(v.muted);
      setIsPlaying(true);
      setIsBlocked(false);
    } catch {
      // 带声音被拦截时退回静音播放；静音仍失败则提示用户手动点击
      if (withSound) {
        v.muted = true;
        try {
          await v.play();
          setIsMuted(true);
          setIsPlaying(true);
          setIsBlocked(false);
          return;
        } catch {
          /* fall through */
        }
      }
      setIsPlaying(false);
      setIsBlocked(true);
    }
  }, []);

  // 视频数据就绪后自动开播（静音）
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onReady = () => {
      if (!finishedRef.current && v.paused) attemptPlay(false);
    };
    if (v.readyState >= 2) onReady();
    v.addEventListener('loadeddata', onReady);
    v.addEventListener('canplay', onReady);
    return () => {
      v.removeEventListener('loadeddata', onReady);
      v.removeEventListener('canplay', onReady);
    };
  }, [attemptPlay]);

  // 兜底：10 秒内既没播放也没报错（例如文件缺失、网络极慢），直接放行，绝不让视频卡住用户
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!finishedRef.current && !isPlaying && !hasFailed) {
        const v = videoRef.current;
        const loaded = Boolean(v && v.readyState >= 1 && Number.isFinite(getMediaDuration(v)));
        if (!loaded) setHasFailed(true);
      }
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [isPlaying, hasFailed]);

  const getMediaDuration = (v: HTMLVideoElement): number => {
    if (Number.isFinite(v.duration) && v.duration > 0) return v.duration;
    // 部分流式源 duration 为 Infinity，改用可跳转区间的末端时间
    if (v.seekable && v.seekable.length > 0) {
      const end = v.seekable.end(v.seekable.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
    return 0;
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const now = v.currentTime;
    setCurrentTime(now);
    const total = duration || getMediaDuration(v);
    // 播放到片尾（含被用户拖到末尾）即视为看完
    if (total > 0 && now >= total - 0.35) finish();
  };

  /** 「跳过视频」：跳到视频最后一帧，与看完等效 */
  const skipToEnd = () => {
    const v = videoRef.current;
    if (!v) return finish();
    const total = duration || getMediaDuration(v);
    if (!total) return finish(); // 拿不到时长（文件缺失等）时直接放行
    try {
      v.currentTime = Math.max(total - 0.2, 0);
    } catch {
      return finish();
    }
    setCurrentTime(v.currentTime);
    finish();
  };

  const toggleSound = async () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setIsMuted(next);
    // 首次交互时若仍未播放，顺手带上声音起播
    if (v.paused && !finishedRef.current) await attemptPlay(!next);
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const remainingSec =
    duration > 0 ? Math.max(0, Math.ceil(duration - currentTime)) : null;

  return (
    <div className="fixed inset-0 z-[200] bg-neutral-950 flex items-center justify-center overflow-hidden">
      {/* 背景微光，避免纯黑压场 */}
      <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(99,102,241,0.28),transparent)]" />

      {/* 视频主体 */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="relative w-full h-full object-contain bg-black"
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onLoadedMetadata={(e) => {
          const total = getMediaDuration(e.currentTarget);
          setDuration(total);
        }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={finish}
        onError={() => setHasFailed(true)}
        onPause={() => setIsPlaying(false)}
        onPlaying={() => setIsPlaying(true)}
      />

      {/* 顶部品牌条 */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-start justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 text-white/90">
          <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          <div className="leading-tight">
            <p className="text-xs sm:text-sm font-black tracking-tight">{t.brand}</p>
            <p className="hidden sm:block text-[11px] text-white/60">{t.slogan}</p>
          </div>
        </div>
      </div>

      {/* 右下角控制条：声音 / 跳过 */}
      {!isFinished && (
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">
            {!hasFailed && (
              <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-indigo-500 transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed">
                {hasFailed ? t.loadFailedHint : t.watching}
                {remainingSec !== null && !hasFailed && (
                  <span className="ml-2 text-white/40">
                    {t.remaining} {remainingSec}
                    {language === 'zh' ? t.sec : ''}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSound}
                  aria-label={isMuted ? t.soundOn : t.soundOff}
                  title={isMuted ? t.soundOn : t.soundOff}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isMuted ? t.soundOn : t.soundOff}</span>
                </button>
                <button
                  type="button"
                  onClick={skipToEnd}
                  className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-neutral-900 text-xs sm:text-sm font-black hover:bg-amber-300 active:scale-95 transition-all"
                >
                  <SkipForward className="w-4 h-4" />
                  {t.skip}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 自动播放被拦截：手动起播 */}
      {isBlocked && !isFinished && !hasFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-950/70">
          <button
            type="button"
            onClick={() => attemptPlay(true)}
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-base shadow-2xl hover:scale-105 active:scale-95 transition-transform"
          >
            <PlayCircle className="w-6 h-6" />
            {t.tapToPlay}
          </button>
          <p className="text-xs text-white/60">{t.tapHint}</p>
          <button
            type="button"
            onClick={skipToEnd}
            className="text-xs font-bold text-white/70 underline underline-offset-4 hover:text-white"
          >
            {t.skip}
          </button>
        </div>
      )}

      {/* 视频加载失败：不阻塞使用 */}
      {hasFailed && !isFinished && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center bg-neutral-950/90">
          <p className="text-white font-black text-base sm:text-lg">{t.loadFailed}</p>
          <p className="text-sm text-white/60 max-w-md leading-relaxed">{t.loadFailedHint}</p>
          <button
            type="button"
            onClick={finish}
            className="mt-2 flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-neutral-900 font-black hover:bg-amber-300 active:scale-95 transition-all"
          >
            {t.enter}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 看完之后：进入网站 */}
      {isFinished && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center bg-neutral-950/92">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-indigo-600 flex items-center justify-center shadow-2xl">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-white text-xl sm:text-2xl font-black tracking-tight">
              {t.finishedTitle}
            </h2>
            <p className="mt-2 text-sm text-white/60 max-w-md leading-relaxed">
              {t.finishedSub}
            </p>
          </div>
          <button
            type="button"
            onClick={onFinish}
            className="mt-2 flex items-center gap-2 px-10 py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-base shadow-2xl hover:from-violet-500 hover:to-indigo-500 hover:scale-105 active:scale-95 transition-all"
          >
            {t.enter}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
