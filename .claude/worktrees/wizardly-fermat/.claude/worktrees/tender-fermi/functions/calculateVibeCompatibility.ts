import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserEmail } = await req.json();

    if (!targetUserEmail) {
      return Response.json({ error: 'targetUserEmail required' }, { status: 400 });
    }

    // Fetch both users' data
    const [targetUsers, userVibe, targetVibe, userInteractions, targetInteractions] = await Promise.all([
      base44.entities.User.filter({ email: targetUserEmail }),
      base44.entities.UserVibe.filter({ user_email: user.email }),
      base44.entities.UserVibe.filter({ user_email: targetUserEmail }),
      base44.entities.UserInteraction.filter({ user_email: user.email }, '-created_date', 100),
      base44.entities.UserInteraction.filter({ user_email: targetUserEmail }, '-created_date', 100)
    ]);

    const targetUser = targetUsers[0];
    if (!targetUser) {
      return Response.json({ error: 'Target user not found' }, { status: 404 });
    }

    let compatibilityScore = 0;
    const reasons = [];

    // 1. Vibe Archetype Compatibility (30 points)
    if (userVibe[0] && targetVibe[0]) {
      const archetypeCompatibility = {
        'architect': ['explorer', 'alchemist', 'guardian'],
        'hunter': ['collector', 'merchant', 'socialite'],
        'collector': ['hunter', 'merchant', 'architect'],
        'explorer': ['architect', 'socialite', 'hunter'],
        'socialite': ['hunter', 'explorer', 'merchant'],
        'merchant': ['collector', 'hunter', 'socialite'],
        'guardian': ['architect', 'alchemist', 'explorer'],
        'alchemist': ['architect', 'guardian', 'explorer']
      };

      const compatible = archetypeCompatibility[userVibe[0].archetype] || [];
      if (compatible.includes(targetVibe[0].archetype)) {
        compatibilityScore += 30;
        reasons.push(`${userVibe[0].archetype} × ${targetVibe[0].archetype} synergy`);
      }

      // Shared traits bonus (5 points per match)
      const sharedTraits = (userVibe[0].traits || []).filter(t => 
        (targetVibe[0].traits || []).includes(t)
      );
      if (sharedTraits.length > 0) {
        compatibilityScore += sharedTraits.length * 5;
        reasons.push(`${sharedTraits.length} shared traits`);
      }
    }

    // 2. Personality Trait Similarity (25 points)
    if (user.personality_traits && targetUser.personality_traits) {
      const traits = ['openness', 'energy', 'social', 'adventure', 'intensity'];
      let traitScore = 0;
      
      traits.forEach(trait => {
        const userVal = user.personality_traits[trait] || 50;
        const targetVal = targetUser.personality_traits[trait] || 50;
        const similarity = 100 - Math.abs(userVal - targetVal);
        traitScore += similarity / traits.length;
      });

      compatibilityScore += (traitScore / 100) * 25;
      reasons.push(`${Math.round(traitScore)}% personality alignment`);
    }

    // 3. Shared Beacon History (20 points)
    const userBeacons = userInteractions
      .filter(i => i.interaction_type === 'scan')
      .map(i => i.beacon_id);
    const targetBeacons = targetInteractions
      .filter(i => i.interaction_type === 'scan')
      .map(i => i.beacon_id);
    
    const sharedBeacons = userBeacons.filter(b => targetBeacons.includes(b));
    if (sharedBeacons.length > 0) {
      const beaconScore = Math.min(20, sharedBeacons.length * 4);
      compatibilityScore += beaconScore;
      reasons.push(`${sharedBeacons.length} shared venues`);
    }

    // 4. Interest Overlap (15 points)
    const userInterests = new Set(user.interests || []);
    const targetInterests = new Set(targetUser.interests || []);
    const sharedInterests = [...userInterests].filter(i => targetInterests.has(i));
    
    if (sharedInterests.length > 0) {
      const interestScore = Math.min(15, sharedInterests.length * 3);
      compatibilityScore += interestScore;
      reasons.push(`${sharedInterests.length} shared interests`);
    }

    // 5. Activity Level Match (10 points)
    if (user.interaction_patterns && targetUser.interaction_patterns) {
      const userFreq = user.interaction_patterns.social_frequency;
      const targetFreq = targetUser.interaction_patterns.social_frequency;
      
      const freqMap = { 'low': 1, 'medium': 2, 'high': 3 };
      const diff = Math.abs((freqMap[userFreq] || 2) - (freqMap[targetFreq] || 2));
      
      if (diff === 0) {
        compatibilityScore += 10;
        reasons.push('Same activity level');
      } else if (diff === 1) {
        compatibilityScore += 5;
        reasons.push('Similar activity level');
      }
    }

    // Round final score
    compatibilityScore = Math.min(100, Math.round(compatibilityScore));

    // Generate AI explanation if high compatibility
    let aiExplanation = null;
    if (compatibilityScore >= 70) {
      const prompt = `You're the HOTMESS OS Matchmaker. Explain why these two users are a ${compatibilityScore}% match in ONE sentence (max 20 words), in ALL CAPS.

User 1: ${userVibe[0]?.vibe_title || 'Unknown vibe'}, interests: ${(user.interests || []).slice(0, 3).join(', ')}
User 2: ${targetVibe[0]?.vibe_title || 'Unknown vibe'}, interests: ${(targetUser.interests || []).slice(0, 3).join(', ')}

Match reasons: ${reasons.join(', ')}`;

      try {
        const explanation = await base44.integrations.Core.InvokeLLM({ prompt });
        aiExplanation = explanation.toUpperCase();
      } catch (error) {
        console.log('AI explanation failed, skipping');
      }
    }

    return Response.json({
      success: true,
      compatibility_score: compatibilityScore,
      reasons,
      ai_explanation: aiExplanation
    });

  } catch (error) {
    console.error('Vibe compatibility error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});