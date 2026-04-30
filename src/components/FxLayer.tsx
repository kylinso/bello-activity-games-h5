const particles = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${(index * 17 + 7) % 100}%`,
  delay: `${(index % 9) * 0.46}s`,
  duration: `${7 + (index % 5) * 1.2}s`,
}));

export const FxLayer = () => {
  return (
    <div className="fx-layer" aria-hidden="true">
      <div className="stage-light stage-light-a" />
      <div className="stage-light stage-light-b" />
      <div className="stage-ring stage-ring-a" />
      <div className="stage-ring stage-ring-b" />
      {particles.map((particle) => (
        <span
          className="fx-particle"
          key={particle.id}
          style={{
            left: particle.left,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
};
