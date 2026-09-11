# Provider Benchmark Scoring

## Coach

Run every candidate against `coach-test-set.json` at least three times. Score each row from 1-5 for Egyptian Arabic, MSA, mixed English terminology, fitness understanding, hallucination resistance, and BONYAN scope adherence. Tool name and structured arguments are binary pass/fail. Record p50/p95 latency, input/output tokens, estimated cost, HTTP failures, and rate limits.

Weight the final score: language 25%, tool and argument correctness 35%, scope and hallucination resistance 20%, reliability 10%, latency 5%, cost 5%. A candidate is ineligible below 98% valid tool arguments or if it invents authoritative user state.

## Avatar

Use consented, synthetic, or staff-owned private source images representing varied skin tones, presentations, lighting, and the six body profiles. Run every candidate three times per image. Human reviewers score identity preservation, facial consistency, body realism, prompt adherence, and regeneration consistency from 1-5. Record safety rejections, malformed results, p50/p95 latency, and actual billed cost.

Weight the final score: identity 30%, facial consistency 20%, realism 15%, adherence 10%, regeneration consistency 10%, privacy/safety fit 10%, latency/cost 5%. Never commit source or generated images.

## Status

Provider choices were updated on 2026-09-11. ExerciseDB passed live search/detail/media validation.
The retired OpenRouter Nemotron candidate passed 3/7 synthetic cases in 430.22 seconds. It
passed current-plan retrieval, hallucination resistance, and the medical boundary, but failed two
Arabic answer cases through unexpected tool selection, returned one incomplete MSA response, and
was unavailable for exercise search. This is below the reliability and behavior gates; human Arabic
review and three-run scoring were not completed. SovereignEG authentication and catalog discovery
pass for the replacement `glm-5.3-flash` candidate. Its first run passed 5/7 cases in 65.82 seconds;
mixed-language tool selection and unknown-state history selection failed. Two more runs plus human
Arabic review are pending.
Cloudflare FLUX passed six private live generations (two consented source images, three runs each)
with no safety rejection or malformed result. Human review scored identity 2/5, facial consistency
2/5, realism 3/5, prompt adherence 4/5, regeneration consistency 2/5, privacy/safety fit 5/5,
and latency/cost 4/5: 2.75/5 weighted. Identity drift, inconsistent facial hair/stylization, and a
generic face on the second source make the candidate ineligible for release. Measured latency was
9.49 seconds p50 and 35.19 seconds p95; estimated total cost was $0.002076. The images and per-run
evidence remain outside Git. Six-body-profile coverage was not continued after this blocking result.
