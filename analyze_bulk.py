"""
Amazon Ads Bulk Export Analyzer
Reads Excel bulk export files and identifies bleeder campaigns
"""

import pandas as pd
import sys
from pathlib import Path

def analyze_campaign(row):
    """Calculate bleeder score for a campaign"""
    score = 0
    issues = []
    severity = 'HEALTHY'
    
    # Get metrics (handle different possible column names)
    spend = float(row.get('Spend', row.get('Cost', 0)) or 0)
    sales = float(row.get('Sales', row.get('Total Sales', 0)) or 0)
    impressions = int(row.get('Impressions', 0) or 0)
    clicks = int(row.get('Clicks', 0) or 0)
    orders = int(row.get('Orders', row.get('Conversions', 0)) or 0)
    
    # Calculate ACOS and ROAS
    if sales > 0:
        acos = (spend / sales) * 100
        roas = sales / spend if spend > 0 else 0
    else:
        acos = 0 if spend == 0 else 999
        roas = 0
    
    # Calculate CPC, CTR, CVR
    cpc = spend / clicks if clicks > 0 else 0
    ctr = (clicks / impressions * 100) if impressions > 0 else 0
    cvr = (orders / clicks * 100) if clicks > 0 else 0
    
    # Factor 1: ACOS Critical (50 points max)
    if acos > 150:
        score += 50
        issues.append(f"ACOS critically high: {acos:.2f}%")
    elif acos > 100:
        score += 40
        issues.append(f"ACOS above 100%: {acos:.2f}%")
    elif acos > 50:
        score += 25
        issues.append(f"ACOS elevated: {acos:.2f}%")
    
    # Factor 2: Zero/Low Conversions (30 points max)
    if orders == 0 and spend > 50:
        score += 30
        issues.append(f"${spend:.2f} spent with zero conversions")
    elif orders == 0 and spend > 20:
        score += 20
        issues.append(f"${spend:.2f} spent with zero conversions")
    
    # Factor 3: Poor ROAS (20 points max)
    if roas < 0.5:
        score += 20
        issues.append(f"ROAS critically low: {roas:.2f}")
    elif roas < 1.0:
        score += 15
        issues.append(f"ROAS below break-even: {roas:.2f}")
    
    # Factor 4: High CPC (15 points max)
    if cpc > 3.0 and orders == 0:
        score += 15
        issues.append(f"Very high CPC (${cpc:.2f}) with no conversions")
    elif cpc > 2.0 and cvr < 1.0:
        score += 10
        issues.append(f"High CPC (${cpc:.2f}) with poor conversion")
    
    # Classify severity
    if score >= 70:
        severity = 'CRITICAL'
    elif score >= 40:
        severity = 'HIGH'
    elif score >= 20:
        severity = 'MEDIUM'
    
    return {
        'score': score,
        'severity': severity,
        'issues': issues,
        'metrics': {
            'spend': spend,
            'sales': sales,
            'acos': acos,
            'roas': roas,
            'impressions': impressions,
            'clicks': clicks,
            'orders': orders,
            'cpc': cpc,
            'ctr': ctr,
            'cvr': cvr,
        }
    }

def main():
    # File paths
    bulk_file = Path('bulk-a3snsjclchkfi8-20251118-20260117-1768683859196.xlsx')
    
    print('='*80)
    print('AMAZON ADS BULK EXPORT ANALYSIS')
    print('='*80)
    print()
    
    if not bulk_file.exists():
        print(f"❌ Error: File not found: {bulk_file}")
        return
    
    # Read Excel file
    print(f"📂 Reading: {bulk_file.name}")
    try:
        df = pd.read_excel(bulk_file)
        print(f"✅ Loaded {len(df)} rows")
        print()
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return
    
    # Show columns
    print(f"📊 Columns found ({len(df.columns)}):")
    for col in df.columns[:20]:
        print(f"   - {col}")
    if len(df.columns) > 20:
        print(f"   ... and {len(df.columns) - 20} more")
    print()
    
    # Filter for campaign-level data (if needed)
    if 'Record Type' in df.columns:
        df = df[df['Record Type'] == 'Campaign']
        print(f"📌 Filtered to {len(df)} campaign records")
        print()
    
    # Analyze each campaign
    results = {'CRITICAL': [], 'HIGH': [], 'MEDIUM': [], 'HEALTHY': []}
    
    for idx, row in df.iterrows():
        campaign_name = row.get('Campaign Name (Informational only)', row.get('Campaign', 'Unknown'))
        
        # Skip rows without campaign name or spend data
        if pd.isna(campaign_name) or campaign_name == 'Unknown':
            continue
        
        analysis = analyze_campaign(row)
        results[analysis['severity']].append({
            'name': campaign_name,
            'analysis': analysis
        })
    
    # Print results
    print('='*80)
    print('BLEEDER DETECTION RESULTS')
    print('='*80)
    print()
    
    # Critical Bleeders
    print(f"🔴 CRITICAL BLEEDERS: {len(results['CRITICAL'])}")
    for campaign in results['CRITICAL']:
        m = campaign['analysis']['metrics']
        print(f"\n   Campaign: {campaign['name']}")
        print(f"   ACOS: {m['acos']:.2f}% | ROAS: {m['roas']:.2f}")
        print(f"   Spend: ${m['spend']:.2f} | Sales: ${m['sales']:.2f}")
        print(f"   Loss: ${(m['spend'] - m['sales']):.2f}")
        print(f"   Bleeder Score: {campaign['analysis']['score']}/100")
        if campaign['analysis']['issues']:
            print(f"   Issues: {'; '.join(campaign['analysis']['issues'][:2])}")
    print()
    
    # High Risk
    print(f"🟠 HIGH RISK: {len(results['HIGH'])}")
    for campaign in results['HIGH'][:5]:
        m = campaign['analysis']['metrics']
        print(f"   - {campaign['name']} (ACOS: {m['acos']:.2f}%, ROAS: {m['roas']:.2f})")
    if len(results['HIGH']) > 5:
        print(f"   ... and {len(results['HIGH']) - 5} more")
    print()
    
    # Medium Risk
    print(f"🟡 MEDIUM RISK: {len(results['MEDIUM'])}")
    for campaign in results['MEDIUM'][:5]:
        m = campaign['analysis']['metrics']
        print(f"   - {campaign['name']} (ACOS: {m['acos']:.2f}%)")
    if len(results['MEDIUM']) > 5:
        print(f"   ... and {len(results['MEDIUM']) - 5} more")
    print()
    
    # Healthy
    print(f"🟢 HEALTHY: {len(results['HEALTHY'])}")
    for campaign in results['HEALTHY'][:5]:
        m = campaign['analysis']['metrics']
        print(f"   - {campaign['name']} (ACOS: {m['acos']:.2f}%, ROAS: {m['roas']:.2f})")
    if len(results['HEALTHY']) > 5:
        print(f"   ... and {len(results['HEALTHY']) - 5} more")
    print()
    
    # Portfolio Summary
    all_campaigns = [c for campaigns in results.values() for c in campaigns]
    if all_campaigns:
        total_spend = sum(c['analysis']['metrics']['spend'] for c in all_campaigns)
        total_sales = sum(c['analysis']['metrics']['sales'] for c in all_campaigns)
        total_impressions = sum(c['analysis']['metrics']['impressions'] for c in all_campaigns)
        total_clicks = sum(c['analysis']['metrics']['clicks'] for c in all_campaigns)
        total_orders = sum(c['analysis']['metrics']['orders'] for c in all_campaigns)
        
        blended_acos = (total_spend / total_sales * 100) if total_sales > 0 else 0
        blended_roas = (total_sales / total_spend) if total_spend > 0 else 0
        blended_cpc = (total_spend / total_clicks) if total_clicks > 0 else 0
        profit = total_sales - total_spend
        
        print('='*80)
        print('PORTFOLIO SUMMARY')
        print('='*80)
        print(f"\nTotal Campaigns: {len(all_campaigns)}")
        print(f"Total Impressions: {total_impressions:,}")
        print(f"Total Clicks: {total_clicks:,}")
        print(f"Total Orders: {total_orders:,}")
        print(f"Total Spend: ${total_spend:,.2f}")
        print(f"Total Sales: ${total_sales:,.2f}")
        print(f"Blended ACOS: {blended_acos:.2f}%")
        print(f"Blended ROAS: {blended_roas:.2f}")
        print(f"Blended CPC: ${blended_cpc:.2f}")
        print(f"Portfolio {'Profit' if profit >= 0 else 'Loss'}: ${abs(profit):,.2f}")
        
        # Potential savings
        critical_loss = sum(
            c['analysis']['metrics']['spend'] - c['analysis']['metrics']['sales']
            for c in results['CRITICAL']
        )
        if critical_loss > 0:
            print(f"\n💰 Potential Monthly Savings (pausing critical bleeders): ~${critical_loss * 4.33:.2f}")
    
    print('\n' + '='*80)

if __name__ == '__main__':
    main()
