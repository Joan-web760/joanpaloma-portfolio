import HomeSection from './HomeSection';
import HomeHeader from './HomeHeader';

export default function VideoIntro({ data }) {
  if (!data?.is_enabled) return null;

  return (
    <HomeSection>
      <HomeHeader title={data.title} subtitle={data.description} />

      <div className="ratio ratio-16x9">
        <iframe
          src={data.video_url}
          title={data.title || 'Video intro'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </HomeSection>
  );
}
