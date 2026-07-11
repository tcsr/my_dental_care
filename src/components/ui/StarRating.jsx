import { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({
  rating = 0,
  maxStars = 5,
  onRatingChange,
  size = 16,
  editable = false,
  color = '#f59e0b', // Amber-500
  inactiveColor = '#cbd5e1' // Slate-300
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {stars.map((star) => {
        const isFilled = editable
          ? (hoverRating ? star <= hoverRating : star <= rating)
          : star <= rating;

        return (
          <Star
            key={star}
            size={size}
            fill={isFilled ? color : 'none'}
            stroke={isFilled ? color : inactiveColor}
            strokeWidth={1.8}
            style={{
              cursor: editable ? 'pointer' : 'default',
              transition: 'transform 0.1s ease, color 0.1s ease',
            }}
            onMouseEnter={() => editable && setHoverRating(star)}
            onMouseLeave={() => editable && setHoverRating(0)}
            onClick={() => editable && onRatingChange && onRatingChange(star)}
          />
        );
      })}
    </div>
  );
}
