import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

# Look for state definitions
states = re.findall(r'const \[.*\] = useState\(.*\);', content)
print("STATES:")
for s in states:
    print(s)

# Look for useEffects
print("\nUSE EFFECTS:")
for match in re.finditer(r'useEffect\(\(\) => \{', content):
    print("Found useEffect at pos", match.start())
