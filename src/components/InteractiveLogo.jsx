function InteractiveLogo({ className = "" }) {
  return (
    <div className={`interactive-logo ${className}`}>
      <svg
        viewBox="0 0 598.86 494.72"
        className="w-full h-full transition-all duration-500 ease-in-out transform hover:scale-105"
        style={{ filter: 'drop-shadow(0 4px 20px rgba(59, 130, 246, 0.3))' }}
      >
        <defs>
          <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="text-blue-600 dark:text-blue-400">
              <animate attributeName="stop-color"
                values="#3B82F6;#8B5CF6;#06B6D4;#3B82F6"
                dur="4s"
                repeatCount="indefinite" />
            </stop>
            <stop offset="50%" className="text-purple-600 dark:text-purple-400">
              <animate attributeName="stop-color"
                values="#8B5CF6;#06B6D4;#3B82F6;#8B5CF6"
                dur="4s"
                repeatCount="indefinite" />
            </stop>
            <stop offset="100%" className="text-cyan-600 dark:text-cyan-400">
              <animate attributeName="stop-color"
                values="#06B6D4;#3B82F6;#8B5CF6;#06B6D4"
                dur="4s"
                repeatCount="indefinite" />
            </stop>
          </linearGradient>

          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="text-gray-300 dark:text-gray-600">
              <animate attributeName="stop-color"
                values="#D1D5DB;#9CA3AF;#6B7280;#D1D5DB"
                dur="3s"
                repeatCount="indefinite" />
            </stop>
            <stop offset="100%" className="text-gray-400 dark:text-gray-500">
              <animate attributeName="stop-color"
                values="#9CA3AF;#6B7280;#D1D5DB;#9CA3AF"
                dur="3s"
                repeatCount="indefinite" />
            </stop>
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g className="logo-elements">
          {/* Side accent shapes */}
          <path
            fill="url(#accentGradient)"
            d="M562.29,195.88l-42.32-67.96c-53.55-48.44-90.03,9.79-90.03,9.79c-4.3,6.93-8.87,14.27-13.57,21.83c36.68,59.01,54.74,87.24,54.74,87.24c0,0.01,0,0.01,0.01,0.02c14.06,25.18,45.87,34.19,71.05,20.12C567.34,252.86,576.35,221.05,562.29,195.88z"
            className="transition-all duration-300 hover:brightness-110"
          />
          <path
            fill="url(#accentGradient)"
            d="M34.22,195.88l42.32-67.96c53.55-48.44,90.03,9.79,90.03,9.79c4.3,6.93,8.87,14.27,13.57,21.83c-36.68,59.01-54.74,87.24-54.74,87.24c0,0.01,0,0.01-0.01,0.02c-14.06,25.18-45.87,34.19-71.05,20.12C29.17,252.86,20.16,221.05,34.22,195.88z"
            className="transition-all duration-300 hover:brightness-110"
          />

          {/* Main central logo shape */}
          <path
            fill="url(#primaryGradient)"
            filter="url(#glow)"
            d="M471.5,49.55c0-0.01,0-0.01-0.01-0.02c-19.64-35.16-71.14-36.18-91.35,0c0,0.01,0,0.01,0,0.02l-68.85,111.23c-6,9.68-20.06,9.68-26.06,0L216.38,49.55c-0.01-0.01-0.01-0.01-0.01-0.02c-20.21-36.18-71.71-35.16-91.35,0c0,0.01,0,0.01-0.01,0.02l-57.92,93.58c53.56-48.44,90.04,9.79,90.04,9.79c36.53,58.83,91.42,146.89,95.31,153.14c19.82,36.27,72.05,35.8,91.61,0c3.9-6.25,58.79-94.3,95.32-153.14c0,0,36.48-58.23,90.03-9.79L471.5,49.55z"
            className="transition-all duration-500 hover:brightness-125"
          >
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1;1.02;1"
              dur="6s"
              repeatCount="indefinite"
            />
          </path>

          {/* MADNA Text */}
          <g fill="url(#primaryGradient)" className="madna-text">
            {/* M */}
            <path d="M27.58,406.9c0-25.95,15.29-38,35.22-38c12.82,0,22.86,5.41,28.73,15.45c5.87-10.04,15.91-15.45,28.73-15.45c19.93,0,35.22,12.05,35.22,38v65.03H135.7V406.9c0-13.9-7.41-19.62-17.15-19.62c-9.73,0-17.15,5.87-17.15,19.62v65.03H81.64V406.9c0-13.75-7.41-19.62-17.15-19.62S47.35,393,47.35,406.9v65.03H27.58V406.9z" className="letter-m">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" begin="0s"/>
            </path>
            {/* A */}
            <path d="M171.38,412.77c0-27.03,15.45-43.87,44.02-43.87c28.58,0,44.33,16.84,44.33,43.87v59.16h-19.77v-30.28h-49.27v30.28h-19.31V412.77z M239.96,423.74v-10.97c0-16.22-8.03-25.49-24.71-25.49c-16.53,0-24.56,9.27-24.56,25.49v10.97H239.96z" className="letter-a">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" begin="0.5s"/>
            </path>
            {/* D */}
            <path d="M278.11,370.91h35.84c35.37,0,53.91,20.23,53.91,50.51c0,30.27-18.54,50.51-53.91,50.51h-35.84V370.91z M313.95,453.71c23.32,0,33.83-12.67,33.83-32.28s-10.5-32.13-33.83-32.13h-16.06v64.41H313.95z" className="letter-d">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" begin="1s"/>
            </path>
            {/* N */}
            <path d="M381.14,411.07c0-25.95,15.29-42.17,42.94-42.17c27.65,0,42.94,16.22,42.94,42.17v60.86h-19.77v-60.86c0-14.98-7.72-23.79-23.17-23.79s-23.17,8.8-23.17,23.79v60.86h-19.77V411.07z" className="letter-n">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" begin="1.5s"/>
            </path>
            {/* A */}
            <path d="M482.93,412.77c0-27.03,15.45-43.87,44.02-43.87s44.33,16.84,44.33,43.87v59.16h-19.77v-30.28h-49.27v30.28h-19.31V412.77z M551.51,423.74v-10.97c0-16.22-8.03-25.49-24.71-25.49c-16.53,0-24.56,9.27-24.56,25.49v10.97H551.51z" className="letter-a-2">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" begin="2s"/>
            </path>
          </g>
        </g>

        <style>
          {`
            .interactive-logo:hover .logo-elements {
              filter: brightness(1.1);
            }
            .interactive-logo:hover .madna-text {
              animation: textGlow 0.5s ease-in-out;
            }
            @keyframes textGlow {
              0% { filter: drop-shadow(0 0 0px rgba(59, 130, 246, 0.5)); }
              50% { filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.8)); }
              100% { filter: drop-shadow(0 0 0px rgba(59, 130, 246, 0.5)); }
            }
          `}
        </style>
      </svg>
    </div>
  )
}

export default InteractiveLogo