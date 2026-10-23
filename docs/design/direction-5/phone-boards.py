"""Writes PhoneShot.dc.html and PhoneShotDark.dc.html beside the round 5 phone boards: the same screens at
393 by 852 with a status bar (9:41, signal, wifi, battery) and a home indicator, and the greeting set lighter
than the logo. site-shots.js captures them for the website's phones.
Usage: python3 phone-boards.py <canvas project folder>"""
import re
import sys

P = sys.argv[1]


def status(ink):
    return (f'<div style="position: absolute; left: 0; right: 0; top: 0; height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 4px 32px 0 44px; box-sizing: border-box; color: {ink}; font: 600 17px Onest, sans-serif; letter-spacing: -0.01em; z-index: 5">'
            '<span>9:41</span>'
            '<span style="display: inline-flex; align-items: center; gap: 7px">'
            f'<svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="8" width="3.2" height="4" rx="1" fill="{ink}"></rect><rect x="5.2" y="5.5" width="3.2" height="6.5" rx="1" fill="{ink}"></rect><rect x="10.4" y="3" width="3.2" height="9" rx="1" fill="{ink}"></rect><rect x="15.6" y="0" width="3.2" height="12" rx="1" fill="{ink}"></rect></svg>'
            f'<svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.2c2.5 0 4.8 1 6.5 2.6l1.2-1.3C14.2 1.6 11.5.4 8.5.4S2.8 1.6.8 3.5L2 4.8c1.7-1.6 4-2.6 6.5-2.6zm0 3.6c1.5 0 2.9.6 3.9 1.5l1.2-1.3C12.3 4.8 10.5 4 8.5 4S4.7 4.8 3.4 6l1.2 1.3c1-.9 2.4-1.5 3.9-1.5zm0 3.6c.6 0 1.1.2 1.5.6L8.5 11.7 7 10c.4-.4.9-.6 1.5-.6z" fill="{ink}"></path></svg>'
            f'<svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="{ink}" stroke-opacity="0.4"></rect><rect x="2.5" y="2.5" width="19" height="8" rx="2.2" fill="{ink}"></rect><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="{ink}" fill-opacity="0.45"></path></svg>'
            '</span></div>')


def home(ink):
    return f'<div style="position: absolute; left: 50%; bottom: 8px; width: 134px; height: 5px; margin-left: -67px; border-radius: 3px; background: {ink}; z-index: 5"></div>'


for name, ink, out in [('R5DashboardPhone', '#09191C', 'PhoneShot.dc.html'), ('R5DashboardPhoneDark', '#FFFFFF', 'PhoneShotDark.dc.html')]:
    s = open(f'{P}/{name}.dc.html', encoding='utf-8').read()
    m = re.search(r'<div style="position: relative; width: 390px; height: 844px; overflow: hidden;([^"]*)">', s)
    s = (s[:m.start()] + f'<div style="position: relative; width: 393px; height: 852px; box-sizing: border-box; padding-top: 50px; overflow: hidden;{m.group(1)}">'
         + status(ink) + home(ink) + s[m.end():])
    s = s.replace('Good evening', 'Good morning')
    s = s.replace('<h1 class="h" style="margin: 0; font-size: 28px; line-height: 1',
                  '<h1 style="margin: 0; font-family: Sora, sans-serif; font-weight: 600; font-size: 22px; letter-spacing: -0.02em; line-height: 1.1')
    open(f'{P}/{out}', 'w', encoding='utf-8').write(s)
    print(out)
