import json
exec(open('eintraege.py').read())
RAUS = set("""パスポートを拝見します ご一緒にいかがですか 大きいサイズはありますか もう少し安いのはありますか 両替できますか また会いましょう 番号でお呼びします 朝食は七時からです 今日、部屋は空いていますか 初期費用はいくらですか 在留カードを見せてください 明日、面接に来られますか 年齢確認をお願いします ラストオーダーです ここは禁煙です 試着してもいいですか お飲み物はいかがですか 落ち着いてください お好きな席へどうぞ 履歴書を持ってきてください 鍵をなくしました 処方箋はありますか""".split())
# nach vorn ziehen (hinter Eintrag X einsortieren)
VOR = {"お手洗いはあちらです":"トイレはどこですか", "大丈夫ですか":"わかりません"}
T1 = {  # Thema für die Einträge mit Staffel-Vorschlag 1
 "flughafen": "滞在の目的は何ですか 観光です パスポートをお願いします どのくらい滞在しますか 一週間です",
 "bahn": "この電車は新宿に行きますか 切符はどこで買えますか 何番線ですか 次は、新宿です まもなく、電車が参ります ドアが閉まります 乗り換えはどこですか 改札を出て右です ICカードはどこで買えますか チャージしたいです 残高が足りません 精算機で精算してください",
 "konbini": "袋はご利用ですか 温めますか ポイントカードはお持ちですか 五百円になります カードで払えますか これを一つください 袋はいりません お箸はおつけしますか お支払いはどうされますか 現金でお願いします 千円お預かりします 二百円のお返しです ありがとうございました 見ているだけです いらっしゃいませ これをください いくらですか すみません、これは何ですか",
 "hotel": "チェックインお願いします 予約しているシュミットです こちらにご記入ください 荷物を預けてもいいですか",
 "strasse": "ここに行きたいです すみません、道に迷いました まっすぐ行って、右です 近いですか 歩いて行けますか トイレはどこですか お手洗いはあちらです 大丈夫ですか",
}
TS = {2:"wohnen",3:"essen",4:"job",5:"reise",6:"gesundheit"}
EXTRA = {"Wi-Fiのパスワードは何ですか":"hotel","エアコンがつきません":"wohnen","チェックアウトお願いします":"hotel","一泊いくらですか":"hotel","充電できますか":"allgemein",
 "はじめまして":"freunde","ドイツから来ました":"freunde","よろしくお願いします":"freunde","おはようございます":"allgemein","こんにちは":"allgemein","こんばんは":"allgemein","ごめんなさい":"allgemein",
 "すこしだけ話せます":"freunde","日本語を勉強しています":"freunde","書いてもらえますか":"allgemein","乾杯":"freunde","連絡先を交換しませんか":"freunde","一緒に行きませんか":"freunde","楽しかったです":"freunde",
 "何時からですか":"allgemein","写真を撮ってもいいですか":"allgemein","写真はご遠慮ください":"reise","助けてください":"notfall","救急車を呼んでください":"notfall","財布をなくしました":"notfall","交番はどこですか":"notfall","避難してください":"notfall","気をつけてください":"allgemein","危ない":"notfall","売り切れです":"job"}
th = {}
for t, s in T1.items():
    for j in s.split(): th[j] = t
rows = [e for e in E if e[1] not in RAUS]
for j, nach in VOR.items():
    r = next(e for e in rows if e[1] == j); rows.remove(r)
    i = next(i for i, e in enumerate(rows) if e[1] == nach); rows.insert(i + 1, r)
out = []
for i, (art, ja, kana, ro, de, sit, niv, st, pr) in enumerate(rows, 1):
    t = EXTRA.get(ja) or th.get(ja) or (TS.get(st) if st != 1 else "allgemein")
    out.append({"id": f"c{i:03d}", "rang": i, "art": art, "ja": ja, "kana": kana, "romaji": ro, "de": de,
                "situation": sit, "niveau": niv, "thema": t, "pruefen": f"[PRÜFEN] {pr}" if pr else None})
json.dump({"version": 1, "hinweis": "Sortiert nach Nutzen (rang). art: sagen = selbst sagen, hoeren = hören/verstehen. Einträge mit pruefen ≠ null erst nach Bestätigung verwenden.",
           "eintraege": out}, open("curriculum.json", "w"), ensure_ascii=False, indent=1)
import collections; print(len(out), collections.Counter(o["thema"] for o in out))
