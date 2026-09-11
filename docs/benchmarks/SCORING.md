# Provider Benchmark Scoring

## Coach

Run every candidate against `coach-test-set.json` at least three times. Score each row from 1-5 for Egyptian Arabic, MSA, mixed English terminology, fitness understanding, hallucination resistance, and BONYAN scope adherence. Tool name and structured arguments are binary pass/fail. Record p50/p95 latency, input/output tokens, estimated cost, HTTP failures, and rate limits.

Weight the final score: language 25%, tool and argument correctness 35%, scope and hallucination resistance 20%, reliability 10%, latency 5%, cost 5%. A candidate is ineligible below 98% valid tool arguments or if it invents authoritative user state.

## Avatar

Use consented, synthetic, or staff-owned private source images representing varied skin tones, presentations, lighting, and the six body profiles. Run every candidate three times per image. Human reviewers score identity preservation, facial consistency, body realism, prompt adherence, and regeneration consistency from 1-5. Record safety rejections, malformed results, p50/p95 latency, and actual billed cost.

Weight the final score: identity 30%, facial consistency 20%, realism 15%, adherence 10%, regeneration consistency 10%, privacy/safety fit 10%, latency/cost 5%. Never commit source or generated images.

## Status

Provider choices were locked on 2026-09-11. ExerciseDB passed live search/detail/media validation.
With explicit authorization, OpenRouter Nemotron passed 3/7 synthetic cases in 430.22 seconds. It
passed current-plan retrieval, hallucination resistance, and the medical boundary, but failed two
Arabic answer cases through unexpected tool selection, returned one incomplete MSA response, and
was unavailable for exercise search. This is below the reliability and behavior gates; human Arabic
review and three-run scoring are not complete. Cloudflare FLUX passed live model execution and
decoding against a repository synthetic fixture in 9.53 seconds. Identity, realism, regeneration,
and human scoring remain blocked until the intended consented private fixture is provided.
