import { BusinessCard, Company, User } from '../types';

export function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export function slugify(value?: string | null, fallback = 'card'): string {
  const cleaned = (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export function ensureUniqueSlug(
  baseSlug: string,
  cards: BusinessCard[],
  excludeCardId?: string
): string {
  const normalizedBase = slugify(baseSlug, 'card');
  const taken = new Set(
    cards
      .filter((c) => !excludeCardId || c.id !== excludeCardId)
      .map((c) => (c.slug || '').toLowerCase().trim())
      .filter(Boolean)
  );

  if (!taken.has(normalizedBase)) {
    return normalizedBase;
  }

  let counter = 2;
  while (taken.has(`${normalizedBase}-${counter}`)) {
    counter += 1;
  }
  return `${normalizedBase}-${counter}`;
}

export function isMasterTemplateCard(card?: Partial<BusinessCard> | null): boolean {
  if (!card) return false;
  if (card.id && card.id.endsWith('-master')) return true;
  if (
    !card.assignedMemberId &&
    (!card.contactPersonName?.trim() ||
      card.designation === 'Headquarters / Master Template')
  ) {
    return true;
  }
  return false;
}

export function formatCardOptionLabel(card: BusinessCard, users?: User[]): string {
  if (isMasterTemplateCard(card)) {
    return `${card.businessName || 'Company'} — Master Template (/${card.slug})`;
  }

  const assignedOwner = card.assignedMemberId
    ? users?.find((u) => u.id === card.assignedMemberId)
    : undefined;
  const personName = card.contactPersonName?.trim() || assignedOwner?.name?.trim();

  if (personName) {
    return `${personName} — ${card.businessName || 'Card'} (/${card.slug})`;
  }

  return `${card.businessName || 'Card'} — Unassigned (/${card.slug})`;
}

export function getUserCompanyIds(user?: Partial<User> | null): string[] {
  if (!user) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  if (Array.isArray(user.companyIds)) {
    for (const cid of user.companyIds) {
      if (cid && typeof cid === 'string' && !seen.has(cid)) {
        seen.add(cid);
        result.push(cid);
      }
    }
  }

  if (user.companyId && typeof user.companyId === 'string' && !seen.has(user.companyId)) {
    seen.add(user.companyId);
    result.push(user.companyId);
  }

  return result;
}

export function syncUserCompanies(
  user: User,
  options?: {
    addCompanyIds?: Array<string | undefined | null>;
    removeCompanyIds?: Array<string | undefined | null>;
    primaryCompanyId?: string;
  }
): User {
  const removeSet = new Set(
    (options?.removeCompanyIds || []).filter((x): x is string => Boolean(x))
  );
  const current = getUserCompanyIds(user).filter((cid) => !removeSet.has(cid));
  const seen = new Set(current);

  for (const cid of options?.addCompanyIds || []) {
    if (cid && !removeSet.has(cid) && !seen.has(cid)) {
      seen.add(cid);
      current.push(cid);
    }
  }

  let nextPrimary =
    options?.primaryCompanyId && seen.has(options.primaryCompanyId)
      ? options.primaryCompanyId
      : user.companyId && seen.has(user.companyId)
      ? user.companyId
      : current[0] || undefined;

  if (removeSet.size > 0 && user.companyId && removeSet.has(user.companyId)) {
    nextPrimary = current[0] || undefined;
  }

  return {
    ...user,
    companyId: nextPrimary,
    companyIds: current,
  };
}

export function deduplicateUsers(
  users: User[],
  deletedUserIds: string[] = []
): User[] {
  const deletedSet = new Set(deletedUserIds);
  const byId = new Map<string, User>();
  const byEmail = new Map<string, string>(); // normalizedEmail -> canonical userId

  // Fold legacy duplicate Zweli Gmail record into canonical Zweli Admin user
  const normalizedInput = users.map((u) => {
    if (u.id === 'user-zweli-gmail' || normalizeEmail(u.email) === 'mzwelisto@gmail.com') {
      return {
        ...u,
        id: 'user-zweli-admin',
        email: 'zweli@msn.com',
      };
    }
    return u;
  });

  for (const rawUser of normalizedInput) {
    if (!rawUser || !rawUser.id) continue;
    if (deletedSet.has(rawUser.id)) continue;

    const cleanEmail = normalizeEmail(rawUser.email);
    const existingIdForEmail = cleanEmail ? byEmail.get(cleanEmail) : undefined;
    const targetId = existingIdForEmail || rawUser.id;
    const existing = byId.get(targetId);

    if (!existing) {
      const normalizedUser = syncUserCompanies({
        ...rawUser,
        email: rawUser.email?.trim() || '',
      });
      byId.set(targetId, normalizedUser);
      if (cleanEmail) byEmail.set(cleanEmail, targetId);
    } else {
      // Merge duplicate user entries deterministically
      const existingTime = existing.updatedAt
        ? Date.parse(existing.updatedAt)
        : Date.parse(existing.createdAt || '0');
      const incomingTime = rawUser.updatedAt
        ? Date.parse(rawUser.updatedAt)
        : Date.parse(rawUser.createdAt || '0');
      const preferIncoming =
        (!existing.assignedCardId && Boolean(rawUser.assignedCardId)) ||
        (incomingTime > existingTime && rawUser.id === existing.id) ||
        (existing.role !== 'admin' && rawUser.role === 'admin');

      const primary = preferIncoming ? rawUser : existing;
      const secondary = preferIncoming ? existing : rawUser;
      const mergedCompanyIds = Array.from(
        new Set([
          ...getUserCompanyIds(existing),
          ...getUserCompanyIds(rawUser),
        ])
      );

      const merged: User = {
        ...secondary,
        ...primary,
        id: existing.id,
        email: primary.email?.trim() || secondary.email?.trim() || '',
        role:
          existing.role === 'admin' || rawUser.role === 'admin'
            ? 'admin'
            : primary.role,
        assignedCardId: primary.assignedCardId || secondary.assignedCardId,
        companyId:
          primary.companyId || secondary.companyId || mergedCompanyIds[0] || undefined,
        companyIds: mergedCompanyIds,
      };
      byId.set(existing.id, merged);
      if (cleanEmail) byEmail.set(cleanEmail, existing.id);
    }
  }

  return Array.from(byId.values());
}

export function deduplicateCards(
  cards: BusinessCard[],
  deletedCardIds: string[] = []
): BusinessCard[] {
  const deletedSet = new Set(deletedCardIds);
  const byId = new Map<string, BusinessCard>();

  for (const card of cards) {
    if (!card || !card.id) continue;
    if (deletedSet.has(card.id)) continue;

    const existing = byId.get(card.id);
    if (!existing) {
      byId.set(card.id, card);
    } else {
      const existingTime = Date.parse(existing.updatedAt || existing.createdAt || '0');
      const incomingTime = Date.parse(card.updatedAt || card.createdAt || '0');
      byId.set(card.id, incomingTime >= existingTime ? card : existing);
    }
  }

  const deduped = Array.from(byId.values());
  const usedSlugs = new Set<string>();

  return deduped.map((card) => {
    const cleanSlug = slugify(card.slug || card.businessName, card.id);
    if (!usedSlugs.has(cleanSlug)) {
      usedSlugs.add(cleanSlug);
      return cleanSlug === card.slug ? card : { ...card, slug: cleanSlug };
    }
    let counter = 2;
    while (usedSlugs.has(`${cleanSlug}-${counter}`)) {
      counter += 1;
    }
    const nextSlug = `${cleanSlug}-${counter}`;
    usedSlugs.add(nextSlug);
    return { ...card, slug: nextSlug };
  });
}

export function reconcileLinks(
  companies: Company[],
  users: User[],
  cards: BusinessCard[],
  options?: { deletedUserIds?: string[]; deletedCardIds?: string[]; deletedCompanyIds?: string[] }
): { companies: Company[]; users: User[]; cards: BusinessCard[] } {
  const deletedCompanySet = new Set(options?.deletedCompanyIds || []);
  const compById = new Map<string, Company>();
  for (const c of companies) {
    if (!c || !c.id || deletedCompanySet.has(c.id)) continue;
    compById.set(c.id, c);
  }
  const cleanCompanies = Array.from(compById.values());
  const hasCompanies = cleanCompanies.length > 0;

  let cleanUsers = deduplicateUsers(users, options?.deletedUserIds || []);
  let cleanCards = deduplicateCards(cards, options?.deletedCardIds || []);

  // Normalize company affiliations on cards
  cleanCards = cleanCards.map((card) => {
    let nextCompanyId = card.companyId;
    if (hasCompanies && nextCompanyId && !compById.has(nextCompanyId)) {
      nextCompanyId = undefined;
    }
    if (!nextCompanyId && hasCompanies && card.businessName) {
      const matches = cleanCompanies.filter(
        (comp) => comp.name.toLowerCase().trim() === card.businessName.toLowerCase().trim()
      );
      if (matches.length === 1) {
        nextCompanyId = matches[0].id;
      }
    }
    return nextCompanyId === card.companyId ? card : { ...card, companyId: nextCompanyId };
  });

  // Clean invalid companyIds on users when companies list is populated
  if (hasCompanies) {
    cleanUsers = cleanUsers.map((user) => {
      const validIds = getUserCompanyIds(user).filter((cid) => compById.has(cid));
      const nextPrimary =
        user.companyId && compById.has(user.companyId)
          ? user.companyId
          : validIds[0] || undefined;
      return {
        ...user,
        companyId: nextPrimary,
        companyIds: validIds,
      };
    });
  }

  // Enforce strict 1-to-1 card <-> user link integrity
  const userMap = new Map(cleanUsers.map((u) => [u.id, { ...u }]));
  const cardMap = new Map(cleanCards.map((c) => [c.id, { ...c }]));

  const lockedUsers = new Set<string>();
  const lockedCards = new Set<string>();

  // Pass 1: Mutual 1-to-1 pairs take highest priority
  for (const card of cleanCards) {
    if (!card.assignedMemberId) continue;
    const user = userMap.get(card.assignedMemberId);
    if (user && user.assignedCardId === card.id) {
      if (!lockedCards.has(card.id) && !lockedUsers.has(user.id)) {
        lockedCards.add(card.id);
        lockedUsers.add(user.id);
      }
    }
  }

  // Pass 2: Card -> User side links where neither side is locked yet
  for (const card of cleanCards) {
    if (lockedCards.has(card.id)) continue;
    const cardRef = cardMap.get(card.id)!;
    if (!card.assignedMemberId) continue;

    const user = userMap.get(card.assignedMemberId);
    if (!user || lockedUsers.has(user.id)) {
      cardRef.assignedMemberId = undefined;
      continue;
    }

    lockedCards.add(card.id);
    lockedUsers.add(user.id);
    user.assignedCardId = card.id;
  }

  // Pass 3: User -> Card side links where neither side is locked yet
  for (const user of cleanUsers) {
    if (lockedUsers.has(user.id)) continue;
    const userRef = userMap.get(user.id)!;
    if (!userRef.assignedCardId) continue;

    const card = cardMap.get(userRef.assignedCardId);
    if (!card || lockedCards.has(card.id)) {
      userRef.assignedCardId = undefined;
      continue;
    }

    lockedUsers.add(user.id);
    lockedCards.add(card.id);
    card.assignedMemberId = userRef.id;
  }

  // Pass 4: Clear any leftover non-locked references and sync companyIds with assigned card
  const finalCards = cleanCards.map((c) => {
    const ref = cardMap.get(c.id)!;
    if (!lockedCards.has(ref.id) && ref.assignedMemberId) {
      return { ...ref, assignedMemberId: undefined };
    }
    return ref;
  });

  const finalCardMap = new Map(finalCards.map((c) => [c.id, c]));
  const finalUsers = cleanUsers.map((u) => {
    let ref = userMap.get(u.id)!;
    if (!lockedUsers.has(ref.id) && ref.assignedCardId) {
      ref = { ...ref, assignedCardId: undefined };
    }
    if (ref.assignedCardId) {
      const assignedCard = finalCardMap.get(ref.assignedCardId);
      if (assignedCard?.companyId) {
        ref = syncUserCompanies(ref, {
          addCompanyIds: [assignedCard.companyId],
          primaryCompanyId: ref.companyId || assignedCard.companyId,
        });
      }
    }
    return ref;
  });

  return {
    companies: cleanCompanies,
    users: finalUsers,
    cards: finalCards,
  };
}
