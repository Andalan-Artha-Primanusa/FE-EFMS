package app

import "encoding/json"

func jsonOrNull(value any) any {
	if value == nil {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return nil
	}
	return string(data)
}

func decodeJSONStringArray(raw string, target *[]string) error {
	if raw == "" || raw == "null" {
		*target = []string{}
		return nil
	}
	return json.Unmarshal([]byte(raw), target)
}
