import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Flex, Progress, Row, Segmented, Tag, Tooltip, Typography } from 'antd';
import { GraduationCap, PlayCircle, CheckCircle2, ExternalLink, Youtube, Film, Clock } from 'lucide-react';
import { Language } from '../types';
import { LEARNING_VIDEOS, LEARNING_CATEGORIES, LEARNING_CATEGORY_LABELS_EN } from '../lib/learningVideos';
import { getLearningProgress, setVideoWatched } from '../lib/storage';
import { PageContainer, PageHeader } from '../components/ui/PageHeader';

interface LearningCenterPageProps {
  language: Language;
}

export const LearningCenterPage: React.FC<LearningCenterPageProps> = ({ language }) => {
  const isEn = language === 'en';
  const t = (zh: string, en: string) => (isEn ? en : zh);
  const [progress, setProgress] = useState(() => getLearningProgress());
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const categories = useMemo(() => ['全部', ...LEARNING_CATEGORIES], []);

  const categoryLabel = (cat: string) => {
    if (!isEn) return cat;
    if (cat === '全部') return 'All';
    return LEARNING_CATEGORY_LABELS_EN[cat] || cat;
  };

  const filteredVideos = useMemo(
    () => (activeCategory === '全部' ? LEARNING_VIDEOS : LEARNING_VIDEOS.filter((v) => v.category === activeCategory)),
    [activeCategory]
  );

  const watchedCount = LEARNING_VIDEOS.filter((v) => progress[v.id]?.watched).length;
  const totalCount = LEARNING_VIDEOS.length;
  const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  const markWatched = (videoId: string, watched: boolean) => setProgress(setVideoWatched(videoId, watched));

  // 站内视频在卡片里直接播放；外链（YouTube）才新开标签页。
  // 此前两种都会新开标签页，站内视频因此同时在新页面和卡片里各播一遍。
  const handlePlay = (videoId: string, url: string, source: string) => {
    if (source === 'internal') {
      setPlayingVideoId(videoId);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <PageContainer>
      <PageHeader
        icon={<GraduationCap className="w-5 h-5" />}
        title={t('商业学习', 'Learn')}
        description={t(
          '成本核算、保本点、签证合规、现金流管理的小课程，学到哪里系统会帮你记住。',
          'Short lessons on costing, break-even, visa compliance and cash flow. Your progress is saved.'
        )}
      >
        <Flex align="center" gap={16} className="mt-4">
          <Progress percent={progressPercent} className="flex-1 m-0" />
          <Typography.Text type="secondary" className="shrink-0">
            {t(`已学完 ${watchedCount}/${totalCount}`, `${watchedCount}/${totalCount} done`)}
          </Typography.Text>
        </Flex>
        <div className="mt-3 overflow-x-auto -mx-1 px-1">
          <Segmented
            value={activeCategory}
            onChange={(v) => setActiveCategory(v as string)}
            options={categories.map((c) => ({ value: c, label: categoryLabel(c) }))}
          />
        </div>
      </PageHeader>

      <Row gutter={[16, 16]}>
        {filteredVideos.map((video) => {
          const isWatched = Boolean(progress[video.id]?.watched);
          const title = isEn ? video.titleEn : video.titleZh;
          const description = isEn ? video.descriptionEn : video.descriptionZh;

          return (
            <Col xs={24} sm={12} lg={8} key={video.id}>
              <Card
                variant="borderless"
                className="shadow-xs h-full"
                styles={{ body: { display: 'flex', flexDirection: 'column', gap: 8, height: '100%' } }}
              >
                <Flex justify="space-between" align="center" gap={8}>
                  <Tag color="cyan" className="me-0">
                    {categoryLabel(video.category)}
                  </Tag>
                  <Flex align="center" gap={4} className="text-xs text-neutral-500">
                    {video.source === 'youtube' ? (
                      <Youtube className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <Film className="w-3.5 h-3.5 text-teal-600" />
                    )}
                    {video.source === 'youtube' ? 'YouTube' : t('站内视频', 'Platform video')}
                  </Flex>
                </Flex>

                <Typography.Text strong className="text-base">
                  {title}
                </Typography.Text>
                <Typography.Paragraph type="secondary" ellipsis={{ rows: 3 }} className="mb-0">
                  {description}
                </Typography.Paragraph>

                {playingVideoId === video.id && video.source === 'internal' && (
                  <video
                    src={video.url}
                    controls
                    autoPlay
                    className="w-full rounded-lg border border-neutral-200"
                    onEnded={() => markWatched(video.id, true)}
                  />
                )}

                <Flex justify="space-between" align="center" className="mt-auto pt-2 border-t border-neutral-100">
                  <Flex align="center" gap={4} className="text-xs text-neutral-500">
                    <Clock className="w-3.5 h-3.5" />
                    {video.durationMinutes} {t('分钟', 'min')}
                  </Flex>
                  <Flex gap={8}>
                    <Tooltip title={isWatched ? t('取消标记已学完', 'Unmark as watched') : t('标记为已学完', 'Mark as watched')}>
                      <Button
                        size="small"
                        type={isWatched ? 'primary' : 'default'}
                        ghost={isWatched}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => markWatched(video.id, !isWatched)}
                      >
                        {isWatched ? t('已学完', 'Done') : t('标为已学', 'Mark done')}
                      </Button>
                    </Tooltip>
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlayCircle className="w-4 h-4" />}
                      onClick={() => handlePlay(video.id, video.url, video.source)}
                    >
                      {t('观看', 'Watch')}
                      {video.source !== 'internal' && <ExternalLink className="w-3 h-3" />}
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            </Col>
          );
        })}
      </Row>
    </PageContainer>
  );
};
