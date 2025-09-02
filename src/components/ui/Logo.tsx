import React from 'react';

type LogoProps = {
  size?: 'small' | 'medium' | 'large';
};

const Logo: React.FC<LogoProps> = ({ size = 'medium' }) => {
  // Tamaños del logo según la propiedad size
  const sizes = {
    small: {
      circle: 'w-8 h-8',
      text: 'text-lg',
      leaf: 'w-3 h-3',
    },
    medium: {
      circle: 'w-12 h-12',
      text: 'text-xl',
      leaf: 'w-4 h-4',
    },
    large: {
      circle: 'w-20 h-20',
      text: 'text-3xl',
      leaf: 'w-6 h-6',
    },
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Círculo naranja (fruta) */}
        <div className={`${sizes[size].circle} rounded-full bg-orange-500 flex items-center justify-center relative`}>
          {/* Hojas verdes */}
          <div className={`${sizes[size].leaf} absolute -top-1 -right-1 bg-green-600 rounded-full transform rotate-45`}></div>
          <div className={`${sizes[size].leaf} absolute -top-2 bg-green-600 rounded-tr-full rounded-tl-full h-3`}></div>
        </div>
      </div>
      
      {/* Texto "TODOFRU" */}
      <div className={`${sizes[size].text} font-bold text-green-700 mt-2 tracking-wider`}>
        TODOFRU<span className="text-xs align-top">®</span>
      </div>
    </div>
  );
};

export default Logo;