import { BusinessFormData, FormAnomalyWarning } from '../types';

/**
 * 第2点：AI 自动识别用户填错的数值及类目并提醒。
 * 全部为本地规则化启发式检测（不调用 AI 接口，零延迟、零隐私风险），
 * 覆盖最常见的"填反单位/填反类目/数量级搞错"等新手易错场景。
 * 仅做提醒，不阻断提交——与产品"评分规则100%透明、AI只做助手不做裁判"的原则一致。
 */
export function detectFormAnomalies(formData: BusinessFormData): FormAnomalyWarning[] {
  const warnings: FormAnomalyWarning[] = [];

  const revenue = formData.monthlyRevenue?.amount || 0;
  const realRevenue = formData.monthlyRealOperatingRevenue?.amount || 0;
  const grants = formData.monthlyExternalGrants?.amount || 0;
  const dynamicCogsTotal = (formData.dynamicCogsItems || []).reduce((s, it) => s + (Number(it.value) || 0), 0);
  const cogs = dynamicCogsTotal > 0 ? dynamicCogsTotal : formData.cogsCost?.amount || 0;
  const rent = formData.rentCost?.amount || 0;
  const labor = formData.laborCost?.amount || 0;
  const utility = formData.utilityCost?.amount || 0;
  const dynamicOpexTotal = (formData.dynamicOpexItems || []).reduce((s, it) => s + (Number(it.value) || 0), 0);
  const fixedOpex = dynamicOpexTotal > 0 ? dynamicOpexTotal : rent + labor + utility;
  const tax = formData.taxCost?.amount || 0;
  const debt = formData.existingDebtMonthlyPayment?.amount || 0;
  const cash = formData.cashAndLiquidAssets?.amount || 0;

  // 1) 进货成本占比异常：COGS 超过总流水，通常是把"年成本"填成"月成本"或类目填反
  if (revenue > 0 && cogs > revenue) {
    warnings.push({
      field: 'cogsCost',
      severity: 'error',
      messageZh: '原材料/进货成本已经超过了你填的总流水，多半是把「年度成本」填成了「月成本」，或者类目/单位填反了，请核对。',
      messageEn: 'Your COGS exceeds total monthly revenue — likely an annual figure entered as monthly, or a mismatched category. Please double-check.'
    });
  } else if (revenue > 0 && cogs / revenue >= 0.8) {
    warnings.push({
      field: 'cogsCost',
      severity: 'warning',
      messageZh: '进货成本占总流水的比例超过 80%，明显偏高，建议确认是否漏填收入或多算了成本。',
      messageEn: 'COGS is over 80% of revenue — unusually high. Please verify revenue is complete and costs are correctly scoped.'
    });
  }

  // 2) 总流水异常偏小但固定开销很大：疑似把"年流水"误填成"月流水"
  if (revenue > 0 && fixedOpex > 0 && fixedOpex > revenue * 3) {
    warnings.push({
      field: 'monthlyRevenue',
      severity: 'warning',
      messageZh: '房租工资等固定开销是总流水的 3 倍以上，很可能是把「年营业额」填成了「月流水」，建议检查单位是按月还是按年。',
      messageEn: 'Fixed operating costs are more than 3x your monthly revenue — check whether revenue was accidentally entered as an annual figure.'
    });
  }

  // 3) 外部赠款超过总流水：数据不一致
  if (grants > 0 && revenue > 0 && grants > revenue) {
    warnings.push({
      field: 'monthlyExternalGrants',
      severity: 'error',
      messageZh: '外部支持款/赠款金额比总流水还大，这在逻辑上不成立，请重新核对两项数字。',
      messageEn: 'External grants exceed total revenue, which is not logically possible. Please re-check both figures.'
    });
  }

  // 4) 真实经营收入与总流水差距过大但未填赠款：疑似类目填错
  if (revenue > 0 && realRevenue > 0 && grants === 0 && Math.abs(revenue - realRevenue) > revenue * 0.3) {
    warnings.push({
      field: 'monthlyRealOperatingRevenue',
      severity: 'warning',
      messageZh: '「真实经营收入」与「总流水」相差超过 30%，但你没有填外部赠款，建议确认两个字段是否填对了类目。',
      messageEn: '"Real operating revenue" differs from total revenue by over 30% with no grants entered — please confirm these fields are filled correctly.'
    });
  }

  // 5) 员工人数与人工成本明显不匹配（有员工却零人工成本，或反之）
  if (formData.fullTimeEmployeesCount > 0 && labor === 0 && dynamicOpexTotal === 0) {
    warnings.push({
      field: 'laborCost',
      severity: 'warning',
      messageZh: `填写了 ${formData.fullTimeEmployeesCount} 名员工，但员工工资为 0，请确认是否漏填人工成本。`,
      messageEn: `You have ${formData.fullTimeEmployeesCount} employee(s) but labor cost is 0 — please confirm this wasn't left blank by mistake.`
    });
  }

  // 6) 经营月数明显不合理（如把"天数"误填成"月数"，或数值过大）
  if (formData.operatingMonthsCount > 0 && formData.operatingMonthsCount > 600) {
    warnings.push({
      field: 'operatingMonthsCount',
      severity: 'error',
      messageZh: '持续经营月数超过 600 个月（50 年），数值明显偏大，请确认单位是「月」而不是「天」或「年」。',
      messageEn: 'Operating months exceeds 600 (50 years) — please confirm the unit is months, not days or years.'
    });
  }

  // 7) 现金备用金异常偏大：可能把"库存估值"误填进了现金
  if (cash > 0 && revenue > 0 && cash > revenue * 200) {
    warnings.push({
      field: 'cashAndLiquidAssets',
      severity: 'warning',
      messageZh: '现金备用金相当于 200 个月以上的流水，数值异常偏大，请确认是否把设备或库存估值误填进了现金字段。',
      messageEn: 'Cash reserves exceed 200 months of revenue — unusually large. Please confirm inventory or equipment value wasn’t entered here by mistake.'
    });
  }

  // 8) 税金及规费为 0 但已填其他大额开销：提醒别漏了这一项（呼应第1点，成本要算全）
  if (revenue > 500 && tax === 0 && (rent > 0 || labor > 0)) {
    warnings.push({
      field: 'taxCost',
      severity: 'warning',
      messageZh: '税金及规费填的是 0：多数地区小微经营也会有营业执照年费、定额税或增值税，建议核实清楚后填写，避免成本算漏。',
      messageEn: 'Tax & regulatory fees are set to 0. Most regions still charge some license fee or flat tax for micro-businesses — please verify to avoid under-counting costs.'
    });
  }

  // 9) 偿债压力极端：还贷远超营收
  if (debt > 0 && revenue > 0 && debt > revenue) {
    warnings.push({
      field: 'existingDebtMonthlyPayment',
      severity: 'error',
      messageZh: '每月还贷金额比总流水还高，通常是把「贷款总额」误填成了「每月还款额」，请核对。',
      messageEn: 'Monthly debt payment exceeds total revenue — likely the total loan amount was entered instead of the monthly installment.'
    });
  }

  return warnings;
}
