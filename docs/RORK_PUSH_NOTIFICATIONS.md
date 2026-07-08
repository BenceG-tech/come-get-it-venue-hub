# Push értesítések – Rork (Expo) mobilapp integráció

Ez a doksi leírja pontosan, **mit kell csinálni a Rork oldalon** (rork.com), hogy a Come Get It admin
felületről küldött értesítések tényleg megérkezzenek a felhasználók telefonjára.

Backend oldal (Supabase edge functions) már készen áll:
- `POST /functions/v1/register-push-token` – push token regisztrálása bejelentkezett usernek
- `POST /functions/v1/send-user-notification` – admin küld egy usernek (Expo Push-on át)
- `POST /functions/v1/process-scheduled-notifications` – ütemezett template-ek küldése (cron kell hozzá)

---

## 1. Csomagok telepítése (Rork/Expo projekt)

```bash
bun expo install expo-notifications expo-device expo-constants
```

`app.json` (vagy `app.config.ts`):

```json
{
  "expo": {
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#1FB1B7"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#1FB1B7",
          "sounds": []
        }
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.comegetit.app",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "package": "com.comegetit.app",
      "googleServicesFile": "./google-services.json",
      "useNextNotificationsApi": true
    }
  }
}
```

**iOS:** Az Expo dashboardon fel kell venni az APNs kulcsot (Apple Developer > Keys). Enélkül iOS-en nem érkezik push.
**Android:** Expo alapból megy a Google FCM-en keresztül.

---

## 2. Push token lekérése + regisztrálás

Készíts egy `src/lib/pushNotifications.ts` fájlt:

```ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase"; // a Rork projekt Supabase kliense

// Beállítás: foreground értesítés is jelenjen meg
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push értesítés csak valós eszközön működik.");
    return null;
  }

  // Permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.warn("Push engedély elutasítva.");
    return null;
  }

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Alapértelmezett",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#1FB1B7",
    });
  }

  // Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;
  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data; // "ExponentPushToken[...]"

  // Regisztráld a backendnél
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn("Nincs bejelentkezett user, push token később kerül regisztrálásra.");
    return token;
  }

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/register-push-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS, // 'ios' | 'android'
        device_name: Device.deviceName,
        app_version: Constants.expoConfig?.version,
      }),
    }
  );
  if (!res.ok) console.error("Push token regisztráció sikertelen", await res.text());
  return token;
}
```

---

## 3. Regisztráció app indításkor + bejelentkezés után

Az `App.tsx` (vagy a fő layout) egy `useEffect`-jében:

```tsx
useEffect(() => {
  registerForPushNotifications().catch(console.error);

  // Deep link kezelés amikor a user rákattint egy értesítésre
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as any;
    if (data?.deep_link) {
      // pl. router.push(data.deep_link)
      console.log("Notification tap, deep link:", data.deep_link);
    }
  });
  return () => sub.remove();
}, []);

// Amikor a user bejelentkezik / kijelentkezik, hívd meg újra:
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) registerForPushNotifications().catch(console.error);
});
```

---

## 4. Ütemezett értesítések (cron beállítás)

A `process-scheduled-notifications` edge function-t **percenként vagy 5 percenként** meg kell hívni.
Ehhez a Supabase SQL Editorba (dashboard) fel kell venni egy cron jobot **egyszer**:

```sql
-- Extensions engedélyezése (csak először kell)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Cron: 5 percenként hívja meg a functiont
select cron.schedule(
  'process-scheduled-notifications',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/process-scheduled-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
    )
  );
  $$
);
```

> ⚠️ A `<SUPABASE_SERVICE_ROLE_KEY>` helyére a Supabase dashboardból a **service_role** kulcsot kell beilleszteni.
> Ne pusheld be gitbe – ezt a SQL-t egyszer, kézzel futtasd a Supabase SQL Editorban.

---

## 5. Teszt flow

1. Rork appban jelentkezz be egy tesztfelhasználóval valós telefonon (nem szimulátoron).
2. Nyisd meg a Supabase Table Editort → `push_tokens` táblát: **kell legyen egy sor** a userhez.
3. Az admin felületen (`/notifications`) küldj magadnak egy értesítést (Send ikon a template mellett).
4. Kapnod kell push notification-t a telefonon néhány másodpercen belül.
5. Ütemezett teszthez: hozz létre új template-et `send_mode='scheduled'`, `scheduled_at = now() + 2 perc`.
   A cron 5 percen belül elküldi.

---

## 6. Hibaelhárítás

| Tünet | Ok / Megoldás |
| --- | --- |
| `push_tokens` üres | `registerForPushNotifications` nem futott le, vagy nincs engedély. Nézd meg a Rork console-t. |
| iOS-en nem érkezik | Hiányzik APNs kulcs Expo dashboardon, VAGY szimulátoron tesztelsz (nem támogatott). |
| Android-on nem érkezik | Hiányzik `google-services.json`, VAGY notification channel nem lett létrehozva. |
| `notification_logs.status = 'failed'` | Nézd meg a `metadata.expo_results` mezőt – Expo hibaüzenet van benne (pl. `DeviceNotRegistered` = régi token, törölni kell). |
| Ütemezett nem megy | Cron nincs beállítva, vagy `sent_at` már ki lett töltve (idempotencia). |

---

## 7. Backend endpoint referencia

### `POST /functions/v1/register-push-token`
**Headers:** `Authorization: Bearer <user_jwt>`, `apikey: <anon_key>`
**Body:**
```json
{
  "token": "ExponentPushToken[xxx]",
  "platform": "ios",
  "device_name": "iPhone 15",
  "app_version": "1.0.0"
}
```

### `POST /functions/v1/send-user-notification`
**Headers:** `Authorization: Bearer <admin_jwt>`
**Body:**
```json
{
  "user_id": "uuid",
  "title": "Hello",
  "body": "Ez egy teszt push",
  "deep_link": "/app/venue/xxx",
  "template_id": null
}
```

### `notification_logs.status` értékek
- `sent` – Expo elfogadta legalább egy tokenre
- `failed` – minden token hibázott
- `no_token` – a usernek nincs regisztrált push token
