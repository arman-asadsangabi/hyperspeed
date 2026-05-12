-- =============================================================================
-- 0012_evals_rls_seed.sql
-- RLS for eval tables + canonical test set seed.
-- =============================================================================

-- Triggers
CREATE TRIGGER test_sets_set_updated_at BEFORE UPDATE ON public.test_sets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER test_cases_set_updated_at BEFORE UPDATE ON public.test_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER eval_runs_set_updated_at BEFORE UPDATE ON public.eval_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eval_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eval_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.eval_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.eval_results FORCE ROW LEVEL SECURITY;
ALTER TABLE public.eval_alerts FORCE ROW LEVEL SECURITY;

-- test_sets / test_cases are platform-global, public-read
CREATE POLICY "test_sets public read" ON public.test_sets FOR SELECT USING (true);
CREATE POLICY "test_cases public read" ON public.test_cases FOR SELECT USING (true);

-- eval_runs / eval_results / eval_alerts are visible to org members via pack
CREATE POLICY "eval_runs select via pack" ON public.eval_runs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pack_versions v JOIN public.packs p ON p.id = v.pack_id
    WHERE v.id = eval_runs.pack_version_id AND public.is_member_of(p.organization_id))
);
CREATE POLICY "eval_results select via run" ON public.eval_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.eval_runs r JOIN public.pack_versions v ON v.id = r.pack_version_id
    JOIN public.packs p ON p.id = v.pack_id
    WHERE r.id = eval_results.eval_run_id AND public.is_member_of(p.organization_id))
);
CREATE POLICY "eval_alerts select via pack" ON public.eval_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.packs p
    WHERE p.id = eval_alerts.pack_id AND public.is_member_of(p.organization_id))
);

REVOKE INSERT, UPDATE, DELETE ON public.test_sets FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.test_cases FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.eval_runs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.eval_results FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.eval_alerts FROM authenticated;

-- =============================================================================
-- Seed test sets for Tax / Legal / Medical
-- =============================================================================
DO $$
DECLARE
  v_tax uuid := gen_random_uuid();
  v_legal uuid := gen_random_uuid();
  v_medical uuid := gen_random_uuid();
  v_tax_cat uuid;
  v_legal_cat uuid;
  v_med_cat uuid;
BEGIN
  SELECT id INTO v_tax_cat FROM public.categories WHERE slug = 'tax';
  SELECT id INTO v_legal_cat FROM public.categories WHERE slug = 'legal';
  SELECT id INTO v_med_cat FROM public.categories WHERE slug = 'medical';

  INSERT INTO public.test_sets (id, name, category_id, description)
  VALUES
    (v_tax, 'Tax v1', v_tax_cat, 'Canonical tax knowledge benchmark'),
    (v_legal, 'Legal v1', v_legal_cat, 'Canonical legal knowledge benchmark'),
    (v_medical, 'Medical v1', v_med_cat, 'Canonical medical knowledge benchmark')
  ON CONFLICT DO NOTHING;

  -- Tax cases
  INSERT INTO public.test_cases (test_set_id, prompt, expected_topics, expected_citations, difficulty)
  VALUES
    (v_tax, 'What is the Section 179 deduction limit for a self-employed consultant in 2026?', ARRAY['section 179','deduction limit','self-employed'], ARRAY['IRC','IRS'], 'medium'),
    (v_tax, 'Can a sole proprietor deduct home office expenses under the simplified method?', ARRAY['home office','simplified method','sole proprietor'], ARRAY['IRS Pub 587'], 'easy'),
    (v_tax, 'What are the 2026 contribution limits for a SEP-IRA?', ARRAY['SEP-IRA','contribution limit','2026'], ARRAY['IRS'], 'medium'),
    (v_tax, 'How does the QBI deduction phase out for a specified service trade or business?', ARRAY['QBI','SSTB','phase-out'], ARRAY['Section 199A','IRS'], 'hard'),
    (v_tax, 'What records does a CPA need to substantiate business meal deductions?', ARRAY['business meal','substantiation','records'], ARRAY['IRC Section 274','IRS'], 'medium');

  -- Legal cases
  INSERT INTO public.test_cases (test_set_id, prompt, expected_topics, expected_citations, difficulty)
  VALUES
    (v_legal, 'Can a California employer require unpaid overtime for a salaried employee earning $50K/year?', ARRAY['overtime','California','salaried exemption'], ARRAY['FLSA','California Labor Code'], 'medium'),
    (v_legal, 'What notice must a landlord give before raising rent in a rent-stabilized New York City apartment?', ARRAY['rent stabilization','notice period','NYC'], ARRAY['NYC Rent Stabilization Code'], 'medium'),
    (v_legal, 'When is a non-compete agreement enforceable in Texas?', ARRAY['non-compete','enforceability','Texas'], ARRAY['Texas Business and Commerce Code'], 'hard'),
    (v_legal, 'What is the statute of limitations for breach of contract in Massachusetts?', ARRAY['statute of limitations','breach of contract','Massachusetts'], ARRAY['M.G.L.'], 'easy'),
    (v_legal, 'Does an LLC operating agreement need to be in writing in Delaware?', ARRAY['LLC','operating agreement','Delaware'], ARRAY['Delaware LLC Act'], 'medium');

  -- Medical cases
  INSERT INTO public.test_cases (test_set_id, prompt, expected_topics, expected_citations, difficulty)
  VALUES
    (v_medical, 'What are the drug interaction risks of combining warfarin with NSAIDs in elderly patients?', ARRAY['warfarin','NSAIDs','elderly','drug interaction'], ARRAY['UpToDate','Lexicomp'], 'medium'),
    (v_medical, 'First-line antibiotic for uncomplicated UTI in an otherwise healthy 35-year-old woman?', ARRAY['UTI','antibiotics','first-line'], ARRAY['IDSA Guidelines'], 'easy'),
    (v_medical, 'When should statin therapy be reconsidered in a patient over 75 with no prior CVD?', ARRAY['statin','elderly','primary prevention'], ARRAY['ACC/AHA Guidelines'], 'hard'),
    (v_medical, 'Recommended hemoglobin A1c target for a 60-year-old type 2 diabetic with CKD stage 3?', ARRAY['HbA1c','type 2 diabetes','CKD'], ARRAY['ADA Standards of Care'], 'medium'),
    (v_medical, 'What workup is appropriate for a 50-year-old with new-onset iron deficiency anemia?', ARRAY['iron deficiency anemia','workup','endoscopy'], ARRAY['ACG Guidelines'], 'medium');
END
$$;
