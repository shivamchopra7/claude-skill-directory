/**
 * Community backend client for Claude Skill Directory
 * Optional social features: likes, comments, and cloud-synced favorites.
 *
 * ─────────────────────────────────────────────────────────────
 * DISABLED BY DEFAULT — READ BEFORE ENABLING
 * ─────────────────────────────────────────────────────────────
 * While COMMUNITY_FEATURES_ENABLED is false, this file never contacts any
 * backend: no network calls, no anonymous accounts, no visitor data leaves the
 * browser. Favorites still work, stored locally in localStorage only.
 *
 * To turn community features on:
 *   1. Create your own Supabase project (https://supabase.com).
 *   2. Apply the migrations in `supabase/migrations/*.sql` (in order) to it.
 *      `supabase/schema.sql` is the consolidated view of that same state.
 *   3. Enable Anonymous sign-ins in Supabase Auth settings.
 *   4. Paste this project's URL and publishable (anon) key below.
 *   5. Flip COMMUNITY_FEATURES_ENABLED to true.
 *
 * Never point these at a Supabase project you do not own: every visitor's
 * likes, comments, and favorites are written to whichever project is
 * configured here.
 */

const COMMUNITY_FEATURES_ENABLED = false;

// Fill these in with your OWN Supabase project before enabling the flag above.
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

// Initialize the Supabase client only when the feature is enabled AND fully
// configured AND the SDK actually loaded. Any missing piece degrades to
// local-only behavior instead of throwing.
const supabaseClient = (() => {
    if (!COMMUNITY_FEATURES_ENABLED) return null;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn(
            'Community features are enabled but SUPABASE_URL / SUPABASE_ANON_KEY ' +
            'are empty in js/supabase-client.js. Running in local-only mode.'
        );
        return null;
    }
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
        console.warn('Supabase SDK not loaded. Running in local-only mode.');
        return null;
    }
    try {
        return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (error) {
        console.warn('Supabase client could not be created. Running in local-only mode.');
        return null;
    }
})();

// Single source of truth for "may we talk to a backend at all?".
const communityEnabled = supabaseClient !== null;

// User state
let currentUser = null;
let isInitialized = false;

// Current user id (works for anonymous and signed-in users)
function getUserId() {
    return currentUser?.id || localStorage.getItem('deviceId') || 'anonymous';
}

// Local-only device id. Created lazily so a visitor of the local-only site is
// never assigned an identifier they did not need.
function getDeviceIdFallback() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Initialize anonymous auth
async function initAuth() {
    if (isInitialized) return currentUser;

    if (!communityEnabled) {
        // Local-only mode: no account is created and nothing is sent anywhere.
        currentUser = null;
        isInitialized = true;
        return currentUser;
    }

    try {
        // Reuse an existing session when present
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session?.user) {
            currentUser = session.user;
        } else {
            // Create an anonymous user
            const { data, error } = await supabaseClient.auth.signInAnonymously();

            if (error) {
                console.warn('Anonymous auth failed, falling back to device ID:', error.message);
                currentUser = { id: getDeviceIdFallback() };
            } else {
                currentUser = data.user;
            }
        }

        isInitialized = true;
        return currentUser;
    } catch (error) {
        console.warn('Auth init failed, falling back to device ID.');
        currentUser = { id: getDeviceIdFallback() };
        isInitialized = true;
        return currentUser;
    }
}

// Track auth state changes (only meaningful when a client exists)
if (communityEnabled) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            currentUser = session.user;
        }
    });
}

// Link a GitHub account (upgrade an anonymous user)
async function linkGitHub() {
    if (!communityEnabled) {
        return { success: false, error: 'Community features are disabled.' };
    }

    const { data, error } = await supabaseClient.auth.linkIdentity({
        provider: 'github',
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

// Sign out
async function signOut() {
    if (!communityEnabled) return { success: false };

    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        currentUser = null;
        isInitialized = false;
        await initAuth();
    }
    return { success: !error };
}

// Is the current user anonymous?
function isAnonymous() {
    return currentUser?.is_anonymous === true;
}

// Current user object
function getUser() {
    return currentUser;
}

// ═══════════════════════════════════════════════════════════
// Likes
// ═══════════════════════════════════════════════════════════

/**
 * Toggle the like state for a skill.
 * @param {string} skillInstall - skill install path
 * @returns {Promise<{liked: boolean, count: number}>}
 */
async function toggleLike(skillInstall) {
    if (!communityEnabled) return toggleLikeLocal(skillInstall);

    try {
        await initAuth();

        const { data, error } = await supabaseClient
            .rpc('toggle_like', {
                p_skill_install: skillInstall
            });

        if (error) throw error;
        return data;
    } catch (error) {
        console.warn('Like request failed, falling back to local storage.');
        return toggleLikeLocal(skillInstall);
    }
}

// Local like fallback
function toggleLikeLocal(skillInstall) {
    const likes = JSON.parse(localStorage.getItem('localLikes') || '{}');
    const isLikedNow = !likes[skillInstall];

    if (isLikedNow) {
        likes[skillInstall] = true;
    } else {
        delete likes[skillInstall];
    }

    localStorage.setItem('localLikes', JSON.stringify(likes));
    return { liked: isLikedNow, count: 0 };
}

function isLikedLocal(skillInstall) {
    const likes = JSON.parse(localStorage.getItem('localLikes') || '{}');
    return !!likes[skillInstall];
}

/**
 * Has this skill been liked?
 * @param {string} skillInstall
 * @returns {Promise<boolean>}
 */
async function isLiked(skillInstall) {
    if (!communityEnabled) return isLikedLocal(skillInstall);

    try {
        const stats = await getSkillStats(skillInstall);
        return !!stats.liked;
    } catch (error) {
        return isLikedLocal(skillInstall);
    }
}

/**
 * Like count for a skill.
 * @param {string} skillInstall
 * @returns {Promise<number>}
 */
async function getLikesCount(skillInstall) {
    if (!communityEnabled) return 0;

    try {
        const { data, error } = await supabaseClient
            .from('skill_stats')
            .select('likes_count')
            .eq('skill_install', skillInstall)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data?.likes_count || 0;
    } catch (error) {
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════
// Comments
// ═══════════════════════════════════════════════════════════

/**
 * Post a comment.
 * @param {string} skillInstall
 * @param {string} content
 * @param {string} nickname
 * @param {number} rating - 1-5
 * @returns {Promise<{id?: string, success: boolean, error?: string}>}
 */
async function addComment(skillInstall, content, nickname = 'Anonymous', rating = null) {
    if (!communityEnabled) {
        return { success: false, error: 'Community features are disabled.' };
    }

    try {
        await initAuth();

        const { data, error } = await supabaseClient
            .rpc('add_comment', {
                p_skill_install: skillInstall,
                p_content: content,
                p_nickname: nickname,
                p_rating: rating
            });

        if (error) throw error;
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Comments for a skill.
 * @param {string} skillInstall
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
async function getComments(skillInstall, limit = 20, offset = 0) {
    if (!communityEnabled) return [];

    try {
        const { data, error } = await supabaseClient
            .from('skill_comments')
            .select('id,skill_install,nickname,content,rating,is_deleted,created_at,updated_at')
            .eq('skill_install', skillInstall)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.warn('Could not load comments.');
        return [];
    }
}

/**
 * Soft-delete one of your own comments.
 * @param {string} commentId
 * @returns {Promise<boolean>}
 */
async function deleteComment(commentId) {
    if (!communityEnabled) return false;

    try {
        await initAuth();

        const { error } = await supabaseClient
            .from('skill_comments')
            .update({ is_deleted: true })
            .eq('id', commentId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.warn('Could not delete comment.');
        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// Favorites (cloud-synced when enabled, local otherwise)
// ═══════════════════════════════════════════════════════════

/**
 * Toggle the favorite state for a skill.
 * @param {string} skillInstall
 * @returns {Promise<boolean>} new favorite state
 */
async function toggleFavoriteCloud(skillInstall) {
    if (!communityEnabled) return toggleFavoriteLocal(skillInstall);

    try {
        await initAuth();
        const { data, error } = await supabaseClient
            .rpc('toggle_favorite', { p_skill_install: skillInstall });

        if (error) throw error;
        return !!data;
    } catch (error) {
        console.warn('Favorite sync failed, falling back to local storage.');
        return toggleFavoriteLocal(skillInstall);
    }
}

// Local favorite fallback
function toggleFavoriteLocal(skillInstall) {
    const favorites = JSON.parse(localStorage.getItem('skillFavorites') || '[]');
    const index = favorites.indexOf(skillInstall);

    if (index > -1) {
        favorites.splice(index, 1);
        localStorage.setItem('skillFavorites', JSON.stringify(favorites));
        return false;
    }

    favorites.push(skillInstall);
    localStorage.setItem('skillFavorites', JSON.stringify(favorites));
    return true;
}

/**
 * All favorites for the current user.
 * @returns {Promise<Array<string>>}
 */
async function getFavorites() {
    const localFavorites = JSON.parse(localStorage.getItem('skillFavorites') || '[]');
    if (!communityEnabled) return localFavorites;

    try {
        await initAuth();

        const { data, error } = await supabaseClient
            .rpc('get_favorites');

        if (error) throw error;
        return (data || []).map(f => f.skill_install);
    } catch (error) {
        return localFavorites;
    }
}

/**
 * Push locally stored favorites up to the community backend.
 * No-op while community features are disabled.
 */
async function syncFavoritesToCloud() {
    if (!communityEnabled) return;

    const localFavorites = JSON.parse(localStorage.getItem('skillFavorites') || '[]');
    if (localFavorites.length === 0) return;

    try {
        await initAuth();

        const cloudFavorites = await getFavorites();
        const toSync = localFavorites.filter(f => !cloudFavorites.includes(f));

        if (toSync.length > 0) {
            const { error } = await supabaseClient
                .rpc('sync_favorites', { p_skill_installs: toSync });

            if (error) throw error;
        }
    } catch (error) {
        console.warn('Could not sync favorites.');
    }
}

// ═══════════════════════════════════════════════════════════
// Stats and rankings
// ═══════════════════════════════════════════════════════════

function localSkillStats(skillInstall) {
    const favorites = JSON.parse(localStorage.getItem('skillFavorites') || '[]');
    return {
        likes_count: 0,
        comments_count: 0,
        liked: isLikedLocal(skillInstall),
        favorited: favorites.includes(skillInstall)
    };
}

/**
 * Aggregate stats for one skill.
 * @param {string} skillInstall
 * @returns {Promise<{likes_count, comments_count, liked, favorited}>}
 */
async function getSkillStats(skillInstall) {
    if (!communityEnabled) return localSkillStats(skillInstall);

    try {
        await initAuth();

        const { data, error } = await supabaseClient
            .rpc('get_skill_stats', {
                p_skill_install: skillInstall
            });

        if (error) throw error;
        return data;
    } catch (error) {
        return localSkillStats(skillInstall);
    }
}

/**
 * Trending skills.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getTrendingSkills(limit = 50) {
    if (!communityEnabled) return [];

    try {
        const { data, error } = await supabaseClient
            .rpc('get_trending_skills', { p_limit: limit });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.warn('Could not load trending skills.');
        return [];
    }
}

/**
 * Stats for many skills at once.
 * @param {Array<string>} skillInstalls
 * @returns {Promise<Object>} - { skillInstall: { likes_count, ... } }
 */
async function getBatchStats(skillInstalls) {
    if (!communityEnabled) return {};

    try {
        const { data, error } = await supabaseClient
            .from('skill_stats')
            .select('*')
            .in('skill_install', skillInstalls);

        if (error) throw error;

        const stats = {};
        (data || []).forEach(s => {
            stats[s.skill_install] = s;
        });
        return stats;
    } catch (error) {
        return {};
    }
}

// ═══════════════════════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════════════════════

// Only reach out to the backend when community features are actually on.
if (communityEnabled) {
    document.addEventListener('DOMContentLoaded', async () => {
        await initAuth();
        setTimeout(syncFavoritesToCloud, 2000);
    });
}

// Global surface used by the UI layer.
// `enabled` lets the renderer hide community UI instead of showing controls
// that would silently do nothing.
window.SkillsDB = {
    enabled: communityEnabled,
    isEnabled: () => communityEnabled,

    // Auth
    initAuth,
    getUser,
    getUserId,
    isAnonymous,
    linkGitHub,
    signOut,

    // Likes
    toggleLike,
    isLiked,
    getLikesCount,

    // Comments
    addComment,
    getComments,
    deleteComment,

    // Favorites
    toggleFavorite: toggleFavoriteCloud,
    getFavorites,

    // Stats
    getSkillStats,
    getTrendingSkills,
    getBatchStats,

    // Raw client (null while community features are disabled)
    client: supabaseClient
};
