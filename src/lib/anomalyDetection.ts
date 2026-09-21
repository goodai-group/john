import { BusinessFormData, FormAnomalyWarning } from '../types.js';
import { convertToTargetCurrency, CUSTOM_CURRENCY_VALUE } from './currencies.js';
import { aggregateMonthlyCosts } from './costAggregation.js';
import { footfallPathIsPartial, pathsConflict, unitsFromDirectSales, unitsFromFootfall } from './revenueEstimate.js';

/**
 * 第2点：AI 自动识别用户填错的数值及类目并提醒。
 * 全部为本地规则化启发式检测（不调用 AI 接口，零延迟、零隐私风险），
 * 覆盖最常见的"填反单位/填反类目/数量级搞错"等新手易错场景。
 * 仅做提醒，不阻断提交——与产品"评分规则100%透明、AI只做助手不做裁判"的原则一致。
 *
 * 所有金额字段各自可单独选择币种，因此这里和评分引擎一样，先统一折算到主报告币种
 * 再比较大小/占比，避免不同币种的数字被直接相加或相除得出错误结论。
 */
export function detectFormAnomalies(formData: BusinessFormData): FormAnomalyWarning[] {
  const warnings: FormAnomalyWarning[] = [];

  const baseCurrency =
    formData.baseCurrency === CUSTOM_CURRENCY_VALUE && formData.customCurrencyCode
      ? formData.customCurrencyCode
      : formData.baseCurrency || 'USD';
  const customRateValue = formData.hasMultipleRates ? formData.customExchangeRateValue : undefined;
  const customRateCode = formData.hasMultipleRates ? baseCurrency : undefined;
  const conv = (field: typeof formData.monthlyRevenue) =>
    convertToTargetCurrency(field, baseCurrency, customRateValue, customRateCode);

  const revenue = conv(formData.monthlyRevenue);
  const realRevenue = conv(formData.monthlyRealOperatingRevenue);
  const grants = conv(formData.monthlyExternalGrants);
  const cash = conv(formData.cashAndLiquidAssets);

  const { cogs, fixedOpex, tax, debtPayment: debt } = aggregateMonthlyCosts(
    formData,
    baseCurrency,
    customRateValue,
    customRateCode
  );
  const labor = conv(formData.laborCost);
  const dynamicOpexTotal = (formData.dynamicOpexItems || []).reduce(
    (s, it) => s + (Number(it.value) || 0),
    0
  );

  // 1) 进货成本占比异常：COGS 超过总流水，通常是把"年成本"填成"月成本"或类目填反
  if (revenue > 0 && cogs > revenue) {
    warnings.push({
      field: 'cogsCost',
      severity: 'error',
      messageZh: '原材料/进货成本已经超过了你填的总流水，多半是把「年度成本」填成了「月成本」，或者类目/单位填反了，请核对。',
      messageEn: 'Your materials/purchasing cost exceeds total monthly revenue — likely an annual figure entered as monthly, or a mismatched item. Please double-check.'
    });
  } else if (revenue > 0 && cogs / revenue >= 0.8) {
    warnings.push({
      field: 'cogsCost',
      severity: 'warning',
      messageZh: '进货成本占总流水的比例超过 80%，明显偏高，建议确认是否漏填收入或多算了成本。',
      messageEn: 'Materials/purchasing cost is over 80% of revenue — unusually high. Please verify revenue is complete and costs are correctly scoped.'
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

  // 8) 税金及规费为 0：提醒别漏了这一项（呼应第1点，成本要算全）。
  // 不再要求「已填其他大额开销」这个前置条件——多数地区小微经营本就会有营业执照年费、定额税
  // 或增值税，税金填 0 本身就值得核实，不必等房租/人工也填了才提醒（对应反馈规则表 R6）。
  if (tax === 0) {
    warnings.push({
      field: 'taxCost',
      severity: 'warning',
      messageZh: '未填写税金，实际经营中通常无法完全免税，请确认是否漏填。',
      messageEn: 'Tax & regulatory fees are set to 0 — most businesses can\'t fully avoid tax in practice. Please confirm this wasn\'t left blank.'
    });
  } else if (revenue > 0 && tax > revenue * 0.3) {
    // 8b) 税金及规费占总流水比例明显异常：多半是把年度税额误填成了月度（对应反馈规则表 R7）
    warnings.push({
      field: 'taxCost',
      severity: 'warning',
      messageZh: '税金及规费占营业额比例偏高，请确认是否误填了年度金额（如果是，可以直接除以 12 换算成月度）。',
      messageEn: 'Tax & fees look high relative to revenue — please confirm this isn\'t an annual figure entered as monthly (if it is, divide by 12).'
    });
  }

  // 8c) 启动资金不足以覆盖一次性投入：公司注册/签证/设备等一次性投入合计超过了填的启动资金，
  // 意味着日常周转资金为负（对应反馈规则表 R4）。
  // 注：逐项注册费用中年度性质的部分（如执照年检）是每年都要再付一次的经常性开支，
  // 不属于一次性资本投入，故只计入 feeType 为 one_time 的部分。
  const oneTimeRegistrationItems = (formData.dynamicRegistrationCostItems || [])
    .filter((it) => it.feeType === 'one_time')
    .reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const oneTimeInvestment =
    conv(formData.companyRegistrationCost) +
    oneTimeRegistrationItems +
    conv(formData.visaFeeCost) +
    (formData.dynamicEquipmentItems || []).reduce((s, it) => s + (Number(it.value) || 0), 0);
  const startupCapital = conv(formData.initialInvestmentEstimate);
  if (oneTimeInvestment > 0 && startupCapital > 0 && startupCapital < oneTimeInvestment) {
    warnings.push({
      field: 'initialInvestmentEstimate',
      severity: 'warning',
      messageZh: '你的启动资金不足以覆盖公司注册/签证/设备等一次性投入，日常周转资金将为负，请确认金额是否填对。',
      messageEn: 'Your initial investment doesn\'t cover one-time costs (registration/visa/equipment) — working capital would be negative. Please confirm the figures.'
    });
  }

  // 10) 「月客流量」「成交率」只填了其中一个：两者要配对才能算出月成单数
  if (footfallPathIsPartial(formData.revenueDetailEstimate)) {
    warnings.push({
      field: 'revenueDetailEstimate',
      severity: 'warning',
      messageZh: '「月客流量」和「成交率」需要两个都填才能算出月成单数：月客流量是本月进店/咨询的总人次，成交率是其中实际下单付款的比例，两者相乘＝月成单数。请补齐另一项，或改用「月销售总量」直接填。',
      messageEn: '"Monthly foot traffic" and "conversion rate" must both be filled to compute monthly orders: foot traffic is total visits/inquiries this month, conversion rate is the share that actually paid. Fill in the missing one, or use "units sold" instead.'
    });
  }

  // 11) 「月销售总量」与「月客流量×成交率」都填了，但算出的月成单数对不上
  if (pathsConflict(formData.revenueDetailEstimate)) {
    const direct = unitsFromDirectSales(formData.revenueDetailEstimate);
    const viaFootfall = unitsFromFootfall(formData.revenueDetailEstimate);
    warnings.push({
      field: 'revenueDetailEstimate',
      severity: 'error',
      messageZh: `「月销售总量」填的是 ${direct} 件，但按「月客流量×成交率」算出来是约 ${Math.round(viaFootfall || 0)} 件，两者对不上。请修改其中一个，或者只保留一种算法，两者一致后这条提醒才会消失。`,
      messageEn: `"Units sold" is ${direct}, but "foot traffic × conversion rate" computes to about ${Math.round(viaFootfall || 0)}. These don't match — please adjust one of them, or keep only one method, until they agree.`
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
