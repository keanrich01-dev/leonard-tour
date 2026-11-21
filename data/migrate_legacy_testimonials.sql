BEGIN;

INSERT INTO public.testimonials
    (name, email, country, photo_path, rating, message, lang, is_approved, created_at)

SELECT
    old.name,
    NULLIF(BTRIM(old.email), ''),
    NULLIF(BTRIM(old.country), ''),
    NULLIF(BTRIM(old.photo), ''),
    5,
    old.comment,
    'en',
    (old.is_approved = 1),
    old.created_at AT TIME ZONE current_setting('TimeZone')

FROM public.testimonial AS old

WHERE old.is_approved = 1
  AND old.comment IS NOT NULL
  AND BTRIM(old.comment) <> ''

  AND NOT EXISTS (
      SELECT 1
      FROM public.testimonials AS current_review
      WHERE current_review.name = old.name
        AND current_review.message = old.comment
        AND current_review.created_at =
            old.created_at AT TIME ZONE current_setting('TimeZone')
  )

RETURNING id, name, country, message, is_approved;

COMMIT;