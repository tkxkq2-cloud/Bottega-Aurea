import React, { useEffect, useState } from 'react';
import { Leaf, Sparkles } from 'lucide-react';
import type { ProductCategory } from '../types/shop';

interface ProductImageProps {
  src?: string;
  alt: string;
  category: ProductCategory;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  category,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const isFood = category === 'food';

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-3 text-center select-none ${
          isFood
            ? 'bg-gradient-to-b from-[#ECEFE3] to-[#E1E6D4] text-[#4A5A39]'
            : 'bg-gradient-to-b from-[#E6EEF6] to-[#D9E5F1] text-[#3B5874]'
        } ${className}`}
      >
        {isFood ? (
          <Leaf className="w-7 h-7 opacity-60 mb-1.5" strokeWidth={1.5} />
        ) : (
          <Sparkles className="w-7 h-7 opacity-60 mb-1.5" strokeWidth={1.5} />
        )}
        <span className="text-[11px] font-medium leading-tight opacity-75 line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
};
