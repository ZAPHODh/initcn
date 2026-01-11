interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g className="fill-current">
        <rect x="64" y="448" width="384" height="48" rx="4" />
        <rect x="96" y="368" width="320" height="48" rx="4" />
      </g>
    </svg>
  );
}
